import Foundation
import SwiftData

@Model
final class Category {
    @Attribute(.unique) var id: UUID
    var name: String            // e.g., "Food", "Transport"
    var type: String            // "income" or "expense"
    var iconName: String        // SF Symbols identifier
    var hexColor: String        // UI presentation
    
    init(name: String, type: String, iconName: String, hexColor: String) {
        self.id = UUID()
        self.name = name
        self.type = type
        self.iconName = iconName
        self.hexColor = hexColor
    }
}
