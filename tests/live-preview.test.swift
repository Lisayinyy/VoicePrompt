import Foundation
import AVFoundation

func expect(_ test: @autoclosure () -> Bool, _ name: String) { precondition(test(), name) }
@main struct PreviewTests {
 static func main() throws {
    var cadence = VoicePreviewCadence()
    cadence.observe(time: 1, power: -60)
    expect(!cadence.shouldRequest(time: 4), "silence does not trigger recognition")
    cadence.observe(time: 1.1, power: -20)
    expect(!cadence.shouldRequest(time: 1.4), "wait for pause")
    expect(cadence.shouldRequest(time: 1.8), "pause triggers one preview")
    cadence.submitted(time: 1.8)
    expect(!cadence.shouldRequest(time: 5), "unchanged silence must not repeat preview")
    cadence.observe(time: 5.1, power: -20)
    expect(cadence.shouldRequest(time: 5.2), "continuous speech refresh is bounded")
    cadence.submitted(time: 5.2)
    cadence.observe(time: 5.3, power: -20)
    expect(!cadence.shouldRequest(time: 5.4), "minimum interval respected for periodic requests")
    expect(cadence.shouldRequest(time: 5.4, forced: true), "manual pause flushes recent speech immediately")
    expect(cadence.shouldRequest(time: 6.2, forced: true), "manual pause flushes")

    let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".wav")
    defer { try? FileManager.default.removeItem(at: url) }
    let format = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 16000, channels: 1, interleaved: true)!
    let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 16000 * 16)!
    buffer.frameLength = buffer.frameCapacity
    for i in 0..<Int(buffer.frameLength) { buffer.int16ChannelData![0][i] = Int16(i % 16000) }
    // Keep the real Apple audio file writer open while taking the snapshot.
    let writer = try AVAudioFile(forWriting: url, settings: format.settings, commonFormat: .pcmFormatInt16, interleaved: true)
    try writer.write(from: buffer)
    let growing = try Data(contentsOf: url)
    let snapshot = try VoiceLiveAudio.snapshot(growing, recordedSeconds: 16)
    expect(snapshot.count == 44 + 12 * 32000, "bounded recent window")
    let capped = try VoiceLiveAudio.snapshot(growing, recordedSeconds: 1)
    expect(capped.count == 44 + 32000, "cap to actual recording time")
    // Unfinalized data-size headers must not hide already flushed audio.
    var unfinished = snapshot
    for i in 4..<8 { unfinished[i] = 0 }
    for i in 40..<44 { unfinished[i] = 255 }
    let repaired = try VoiceLiveAudio.snapshot(unfinished, recordedSeconds: 12)
    expect(repaired == snapshot, "stale RIFF headers supported")
    do { _ = try VoiceLiveAudio.snapshot(Data([1,2,3]), recordedSeconds: 1); preconditionFailure("bad file accepted") } catch {}
    print("PASS: silence/pause cadence, throttling, open Apple WAV writer, bounded window, recorder-time cap and unfinished headers")
 }
}
