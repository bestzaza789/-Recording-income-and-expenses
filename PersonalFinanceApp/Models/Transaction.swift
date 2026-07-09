import Foundation
import SwiftData

@Model
final class Transaction {
    @Attribute(.unique) var id: UUID
    var amount: Double
    var transactionType: String // "income", "expense", "transfer"
    var date: Date
    var note: String?
    
    var account: Account?       // Source account (or destination for income)
    var toAccount: Account?     // Only used if transactionType == "transfer"
    var category: Category?     // Associated category
    
    init(amount: Double, transactionType: String, date: Date, note: String? = nil) {
        self.id = UUID()
        self.amount = amount
        self.transactionType = transactionType
        self.date = date
        self.date = date
        self.note = note
    }
}
