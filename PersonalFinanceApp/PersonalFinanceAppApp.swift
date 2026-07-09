import SwiftUI
import SwiftData

@main
struct PersonalFinanceAppApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [
            Account.self,
            Category.self,
            Transaction.self
        ])
    }
}
