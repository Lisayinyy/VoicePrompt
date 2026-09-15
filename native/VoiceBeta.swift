import Foundation
import Security
import CryptoKit

enum VoiceBeta {
    static let service = "ai.voiceprompt.beta"
    enum ConnectionIssue: Error, LocalizedError, Equatable {
        case offline, timedOut, serviceUnavailable, busy, authorization, localServiceUnavailable, verificationFailed

        var title: String {
            switch self {
            case .offline: return "等待联网"
            case .authorization: return "等待授权"
            case .busy: return "服务繁忙"
            case .localServiceUnavailable: return "本地服务未就绪"
            case .verificationFailed: return "尚未就绪"
            case .timedOut, .serviceUnavailable: return "服务暂不可用"
            }
        }
        var errorDescription: String? {
            switch self {
            case .offline: return "联网后点重试，语音识别仍可使用"
            case .timedOut: return "润色服务响应超时，请稍后重试。无需修改配置"
            case .serviceUnavailable: return "免费润色暂不可用，无需修改配置。语音识别仍可使用"
            case .busy: return "免费润色暂时繁忙，请稍后重试。语音识别仍可使用"
            case .authorization: return "请点重试并确认这台 Mac 的钥匙串授权"
            case .localServiceUnavailable: return "请重新打开 Voice Prompt，再试一次"
            case .verificationFailed: return "暂未完成润色验证，请稍后重试。语音识别仍可使用"
            }
        }
        static func classify(_ error: Error, verifying: Bool = false) -> Self {
            if let issue = error as? Self { return issue }
            let network = error as NSError
            guard network.domain == NSURLErrorDomain else { return .verificationFailed }
            switch network.code {
            case NSURLErrorNotConnectedToInternet, NSURLErrorDataNotAllowed: return .offline
            case NSURLErrorTimedOut: return .timedOut
            case NSURLErrorCannotConnectToHost where verifying: return .localServiceUnavailable
            default: return .serviceUnavailable
            }
        }
    }
    final class CredentialWaiter: @unchecked Sendable {
        private let lock = NSLock()
        private var continuation: CheckedContinuation<String?, Error>?
        init(_ continuation: CheckedContinuation<String?, Error>) { self.continuation = continuation }
        func finish(_ result: Result<String?, Error>) {
            lock.lock(); let pending = continuation; continuation = nil; lock.unlock()
            pending?.resume(with: result)
        }
    }
    static func credentialAsync(account: String, create: Bool, allowInteraction: Bool) async throws -> String? {
        try await withCheckedThrowingContinuation { continuation in
            let waiter = CredentialWaiter(continuation)
            DispatchQueue.global(qos: .userInitiated).async {
                do { waiter.finish(.success(try credential(account: account, create: create, allowInteraction: allowInteraction))) }
                catch { waiter.finish(.failure(error)) }
            }
            DispatchQueue.global().asyncAfter(deadline: .now() + 12) {
                waiter.finish(.failure(ConnectionIssue.authorization))
            }
        }
    }
    static func account(base: String, code: String) -> String {
        let normalized = code.uppercased().filter { !$0.isWhitespace && $0 != "-" }
        return SHA256.hash(data: Data((base + ":" + normalized).utf8)).map { String(format: "%02x", $0) }.joined()
    }
    static func credential(account: String, create: Bool = false, allowInteraction: Bool = true) throws -> String? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service, kSecAttrAccount as String: account]
        var result: CFTypeRef?
        var read = query; read[kSecReturnData as String] = true; read[kSecMatchLimit as String] = kSecMatchLimitOne
        if !allowInteraction { read[kSecUseAuthenticationUI as String] = kSecUseAuthenticationUIFail }
        let status = SecItemCopyMatching(read as CFDictionary, &result)
        if status == errSecSuccess, let data = result as? Data, let value = String(data: data, encoding: .utf8) { return value }
        if !allowInteraction && status == errSecInteractionNotAllowed { return nil }
        guard status == errSecItemNotFound else { throw ConnectionIssue.authorization }
        guard create else { return nil }
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else { throw failure("无法创建设备凭证，请重试") }
        let value = Data(bytes).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
        var item = query; item[kSecValueData as String] = Data(value.utf8)
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { throw ConnectionIssue.authorization }
        return value
    }
    static func failure(_ message: String) -> NSError { NSError(domain: "Voice Prompt", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
    static func enroll(credential: String) async throws {
        var request = URLRequest(url: URL(string: "https://api.voiceprompt.work/client/enroll")!)
        request.httpMethod = "POST"; request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["credential": credential])
        let session = URLSession(configuration: .ephemeral, delegate: NoRedirect(), delegateQueue: nil)
        defer { session.finishTasksAndInvalidate() }
        let (data, response) = try await session.data(for: request)
        let result = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        guard (response as? HTTPURLResponse)?.statusCode == 200, result?["activated"] as? Bool == true, result?["plan"] as? String == "free" else {
            if (response as? HTTPURLResponse)?.statusCode == 429 { throw ConnectionIssue.busy }
            throw ConnectionIssue.serviceUnavailable
        }
    }
    static func redeem(base: String, code: String, credential: String) async throws {
        guard let url = URL(string: base), url.user == nil, url.password == nil, url.query == nil, url.fragment == nil,
              url.path.isEmpty || url.path == "/", url.scheme == "https" || base == "http://127.0.0.1:18788" else { throw failure("激活服务地址不可用") }
        var request = URLRequest(url: url.appendingPathComponent("beta/redeem")); request.httpMethod = "POST"; request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["code": code, "credential": credential])
        let (data, response) = try await URLSession(configuration: .ephemeral, delegate: NoRedirect(), delegateQueue: nil).data(for: request)
        let result = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        guard (response as? HTTPURLResponse)?.statusCode == 200, result?["activated"] as? Bool == true else {
            let messages = ["invitation_used": "这个邀请码已经用于另一台设备，请使用新的邀请码", "invitation_expired": "邀请码已过期，请领取新的邀请码", "entitlement_expired": "内测资格已到期，请联系邀请人", "device_already_activated": "这台设备已经激活", "rate_limit": "尝试过于频繁，请一分钟后重试"]
            throw failure(messages[result?["error"] as? String ?? ""] ?? "邀请码无效或激活服务不可用，请检查后重试")
        }
    }
    final class NoRedirect: NSObject, URLSessionTaskDelegate {
        func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
    }
}
