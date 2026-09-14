import Foundation
@main struct InputReadinessTests {
 static func main() {
  assert(VoiceInputReadiness.blocker(microphone:false,accessibility:false,autoInsert:true)=="microphone_required")
  assert(VoiceInputReadiness.blocker(microphone:true,accessibility:false,autoInsert:true)=="accessibility_required")
  assert(VoiceInputReadiness.blocker(microphone:true,accessibility:true,autoInsert:true)==nil)
  assert(VoiceInputReadiness.blocker(microphone:true,accessibility:false,autoInsert:false)==nil)
  assert(VoiceInputReadiness.blocker(microphone:true,accessibility:false,autoInsert:true,editorOwned:true)==nil)
  assert(VoiceInputReadiness.blocker(microphone:false,accessibility:false,autoInsert:true,editorOwned:true)=="microphone_required")
  print("6 input readiness checks passed")
 }
}
