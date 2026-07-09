import Foundation
import SwiftData

@Model
final class Account {
    @Attribute(.unique) var id: UUID
    var name: String            // e.g., "Cash", "KBank", "SCB"
    var accountType: String     // "cash", "bank", "credit"
    var initialBalance: Double
    var currentBalance: Double
    
    @Relationship(deleteRule: .cascade, inverse: \Transaction.account)
    var transactions: [Transaction]? = []

    init(name: String, accountType: String, initialBalance: Double) {
        self.id = UUID()
        self.name = name
        self.accountType = accountType
        self.initialBalance = initialBalance
        self.currentBalance = initialBalance
    }
}
