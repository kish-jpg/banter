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

    public init(baseURL: URL = URL(string: "http://localhost:54321")!, session: URLSession = .shared) {
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
