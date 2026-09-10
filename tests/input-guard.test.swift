import Foundation
@main struct InputGuardTests {
 static func main() {
  let original = VoiceInputSnapshot(role:"AXTextArea", identifier:"composer", bounds:CGRect(x:10,y:20,width:300,height:80), value:"中文 hello", selection:NSRange(location:8,length:0), document:"https://example.test/chat/one")
  var current = original
  assert(VoiceInputGuard.failure(before:original,now:current,sameElement:false)==nil)
  current.role="AXTextField"
  assert(VoiceInputGuard.failure(before:original,now:current,sameElement:false)==nil)
  current=original; current.value="user typed more"
  assert(VoiceInputGuard.failure(before:original,now:current,sameElement:true)=="输入框内容已改变")
  current=original; current.selection=NSRange(location:0,length:0)
  assert(VoiceInputGuard.failure(before:original,now:current,sameElement:false)=="光标位置已改变")
  current=original; current.identifier="search"
  assert(VoiceInputGuard.failure(before:original,now:current,sameElement:false)=="输入框已切换")
  current=original; current.document="https://example.test/chat/two"
  assert(VoiceInputGuard.failure(before:original,now:current,sameElement:true)=="页面已切换")
  current=original; current.bounds=CGRect(x:100,y:200,width:300,height:80)
  assert(VoiceInputGuard.failure(before:original,now:current,sameElement:false)=="无法确认当前输入框")
  current=original; current.value=nil
  assert(VoiceInputGuard.failure(before:original,now:current,sameElement:false)=="无法确认当前输入框")
  current=original; current.identifier=nil
  assert(VoiceInputGuard.failure(before:original,now:current,sameElement:false)==nil)
  print("9 input identity regression checks passed")
 }
}
