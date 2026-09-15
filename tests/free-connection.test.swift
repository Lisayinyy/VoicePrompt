import Foundation

@main struct FreeConnectionTests {
    static func main() {
        typealias Issue = VoiceBeta.ConnectionIssue
        func network(_ code: Int) -> NSError { NSError(domain: NSURLErrorDomain, code: code) }
        precondition(Issue.classify(network(NSURLErrorSecureConnectionFailed)) == .serviceUnavailable)
        precondition(Issue.classify(network(NSURLErrorServerCertificateUntrusted)) == .serviceUnavailable)
        precondition(Issue.classify(network(NSURLErrorNotConnectedToInternet)) == .offline)
        precondition(Issue.classify(network(NSURLErrorTimedOut)) == .timedOut)
        precondition(Issue.classify(network(NSURLErrorCannotConnectToHost)) == .serviceUnavailable)
        precondition(Issue.classify(network(NSURLErrorCannotConnectToHost), verifying: true) == .localServiceUnavailable)
        precondition(Issue.classify(Issue.authorization) == .authorization)
        precondition(Issue.classify(Issue.busy) == .busy)
        let raw = NSError(domain: "Unexpected", code: 1, userInfo: [NSLocalizedDescriptionKey: "private-provider-response"])
        let safe = Issue.classify(raw)
        precondition(safe == .verificationFailed && !safe.localizedDescription.contains("private-provider-response"))
        precondition(Issue.serviceUnavailable.localizedDescription.contains("无需修改配置"))
        precondition(Issue.serviceUnavailable.title != Issue.authorization.title)
        print("PASS: service, offline, timeout, local process and authorization failures remain distinct; unexpected details are not displayed")
    }
}
