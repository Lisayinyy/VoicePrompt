import Foundation
@main struct DirectEditTests {
    static func main() {
        assert(VoiceDirectEdit.replacing("@Voice Prompt ", selection: NSRange(location: 14, length: 0), with: "你好") == "@Voice Prompt 你好")
        assert(VoiceDirectEdit.replacing("中文 hello", selection: NSRange(location: 3, length: 5), with: "世界") == "中文 世界")
        assert(VoiceDirectEdit.replacing("a🦊b", selection: NSRange(location: 1, length: 2), with: "猫") == "a猫b")
        assert(VoiceDirectEdit.replacing("a🦊b", selection: NSRange(location: 2, length: 0), with: "X") == nil)
        assert(VoiceDirectEdit.replacing("abc", selection: NSRange(location: 8, length: 0), with: "X") == nil)
        assert(VoiceDirectEdit.replacing("abc", selection: NSRange(location: NSNotFound, length: 0), with: "X") == nil)
        assert(VoiceDirectEdit.replacing("before after", selection: NSRange(location: 7, length: 0), with: "不要改。\n") == "before 不要改。\nafter")
        assert(VoiceDirectEdit.mentionsVoicePrompt("@voice-prompt "))
        assert(VoiceDirectEdit.mentionsVoicePrompt("  @Voice Prompt 你好"))
        assert(!VoiceDirectEdit.mentionsVoicePrompt("请解释 @voice-prompt"))
        assert(!VoiceDirectEdit.mentionsVoicePrompt("@voice-prompt-extra"))
        assert(!VoiceDirectEdit.mentionsVoicePrompt("name@voice-prompt.com"))
        assert(!VoiceDirectEdit.mentionsVoicePrompt(nil))
        print("13 direct-edit and explicit-invocation checks passed")
    }
}
