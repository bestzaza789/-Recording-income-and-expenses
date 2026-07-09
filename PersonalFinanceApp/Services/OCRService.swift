import Foundation
import Vision
import SwiftUI

class OCRService {
    static let shared = OCRService()
    
    private init() {}
    
    struct ParsedData {
        var amount: Double?
        var accountKeyword: String?
        var categoryKeyword: String?
    }
    
    func recognizeText(from image: UIImage, completion: @escaping (ParsedData) -> Void) {
        guard let cgImage = image.cgImage else {
            completion(ParsedData())
            return
        }
        
        let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        let request = VNRecognizeTextRequest { request, error in
            guard let observations = request.results as? [VNRecognizedTextObservation], error == nil else {
                completion(ParsedData())
                return
            }
            
            let recognizedText = observations.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
            let parsedData = self.parseExtractedText(recognizedText)
            
            DispatchQueue.main.async {
                completion(parsedData)
            }
        }
        
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["th-TH", "en-US"]
        
        do {
            try requestHandler.perform([request])
        } catch {
            completion(ParsedData())
        }
    }
    
    private func parseExtractedText(_ text: String) -> ParsedData {
        var data = ParsedData()
        
        // Amount parsing: \d{1,3}(,\d{3})*\.\d{2}
        let regex = try? NSRegularExpression(pattern: "\\d{1,3}(,\\d{3})*\\.\\d{2}")
        let range = NSRange(location: 0, length: text.utf16.count)
        if let match = regex?.firstMatch(in: text, options: [], range: range) {
            if let swiftRange = Range(match.range, in: text) {
                let amountString = String(text[swiftRange]).replacingOccurrences(of: ",", with: "")
                data.amount = Double(amountString)
            }
        }
        
        // Account detection keywords
        let lowercasedText = text.lowercased()
        if lowercasedText.contains("kbank") || lowercasedText.contains("กสิกร") {
            data.accountKeyword = "kbank"
        } else if lowercasedText.contains("scb") || lowercasedText.contains("ไทยพาณิชย์") {
            data.accountKeyword = "scb"
        }
        
        // Category detection keywords
        if lowercasedText.contains("7-eleven") || lowercasedText.contains("grab") || lowercasedText.contains("lotus") {
            data.categoryKeyword = "food"
        } else if lowercasedText.contains("ptt") || lowercasedText.contains("ปั๊ม") || lowercasedText.contains("mrt") || lowercasedText.contains("bts") {
            data.categoryKeyword = "transport"
        }
        
        return data
    }
}
