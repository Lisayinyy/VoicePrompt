import Foundation

// Meter-driven throttling: silence flushes once; continuous speech refreshes periodically.
struct VoicePreviewCadence {
    var lastSpeech = -Double.infinity
    var submittedSpeech = -Double.infinity
    var lastRequest = -Double.infinity
    mutating func observe(time: Double, power: Float) { if power > -44 { lastSpeech = time } }
    func shouldRequest(time: Double, forced: Bool = false) -> Bool {
        guard lastSpeech.isFinite, lastSpeech > submittedSpeech, time >= 0.55, (forced || time - lastRequest >= 0.9) else { return false }
        return forced || time - lastSpeech >= 0.65 || (lastRequest.isFinite ? time - lastRequest >= 3.2 : time >= 2.4)
    }
    mutating func submitted(time: Double) { lastRequest = time; submittedSpeech = lastSpeech }
}

// AVAudioRecorder has not finalized its RIFF/data lengths while recording. Copy only
// currently available complete PCM frames, capped by recorder time, into a valid WAV.
// The original recorder stays running: no stop/restart gaps and no microphone duplication.
enum VoiceLiveAudio {
    static func snapshot(_ bytes: Data, recordedSeconds: Double, windowSeconds: Double = 12) throws -> Data {
        func u16(_ i: Int) -> Int { Int(bytes[i]) | Int(bytes[i + 1]) << 8 }
        func u32(_ i: Int) -> Int { u16(i) | u16(i + 2) << 16 }
        func tag(_ i: Int) -> String { String(data: bytes.subdata(in: i..<i+4), encoding: .ascii) ?? "" }
        guard bytes.count >= 44, recordedSeconds.isFinite, recordedSeconds > 0,
              tag(0) == "RIFF", tag(8) == "WAVE" else { throw PreviewError.incomplete }
        var offset = 12, validFormat = false
        while offset + 8 <= bytes.count {
            let size = u32(offset + 4), name = tag(offset)
            if name == "data" {
                guard validFormat else { throw PreviewError.incomplete }
                let available = (bytes.count - offset - 8) / 2
                let endFrame = min(available, Int(min(recordedSeconds, 305) * 16000))
                let startFrame = max(0, endFrame - Int(windowSeconds * 16000))
                guard endFrame - startFrame >= 8000 else { throw PreviewError.incomplete }
                let pcm = bytes.subdata(in: (offset + 8 + startFrame * 2)..<(offset + 8 + endFrame * 2))
                var wav = Data()
                func ascii(_ s: String) { wav.append(contentsOf: s.utf8) }
                func le(_ n: Int, _ count: Int) { for b in 0..<count { wav.append(UInt8((n >> (b * 8)) & 255)) } }
                ascii("RIFF"); le(36 + pcm.count, 4); ascii("WAVEfmt "); le(16, 4)
                le(1, 2); le(1, 2); le(16000, 4); le(32000, 4); le(2, 2); le(16, 2)
                ascii("data"); le(pcm.count, 4); wav.append(pcm); return wav
            }
            guard size <= bytes.count - offset - 8 else { throw PreviewError.incomplete }
            if name == "fmt " {
                guard size >= 16, u16(offset + 8) == 1, u16(offset + 10) == 1,
                      u32(offset + 12) == 16000, u16(offset + 22) == 16 else { throw PreviewError.unsupported }
                validFormat = true
            }
            offset += 8 + size + size % 2
        }
        throw PreviewError.incomplete
    }
    enum PreviewError: Error { case incomplete, unsupported }
}
