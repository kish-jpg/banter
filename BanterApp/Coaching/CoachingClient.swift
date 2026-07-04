import Foundation
import BanterShared

/// Thin URLSession transport to the coaching edge function. The app's first
/// outbound network call — speaks only the locked
/// AnalyzeConversationRequest/CoachingResponseDTO contract (BanterShared/NetworkDTOs.swift),
/// no new request/response model. Mirrors OCRPipeline's async-throws style.
///
/// Carries no secret literal: the coaching endpoint takes no API key from
/// the client (the LLM provider secret lives server-side only, per
/// T-03-04/GeminiKeyBoundaryGuardTests).
public enum CoachingClientError: Error {
    case invalidResponse
    case server(statusCode: Int)
}

public struct CoachingClient {
    public let baseURL: URL
    private let session: URLSession

    /// Default endpoint. DEBUG builds target the local Supabase edge runtime;
    /// release builds deliberately resolve to an unroutable sentinel host so
    /// a missing production endpoint fails fast at the suggestions screen's
    /// error+Retry surface instead of silently POSTing to localhost.
    /// ponytail: no production endpoint exists yet — swap the release branch
    /// for the deployed URL (via xcconfig/Info.plist) once one does; tracked
    /// in .planning/phases/04-companion-app-ui-paywall/deferred-items.md.
    public static let defaultBaseURL: URL = {
        #if DEBUG
        URL(string: "http://localhost:54321")!
        #else
        URL(string: "https://coaching-endpoint-not-configured.invalid")!
        #endif
    }()

    public init(baseURL: URL = CoachingClient.defaultBaseURL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    public func send(_ request: AnalyzeConversationRequest) async throws -> CoachingResponseDTO {
        let url = baseURL.appendingPathComponent("functions/v1/coaching")
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)

        let (data, response) = try await session.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw CoachingClientError.invalidResponse
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            throw CoachingClientError.server(statusCode: httpResponse.statusCode)
        }

        return try JSONDecoder().decode(CoachingResponseDTO.self, from: data)
    }
}
