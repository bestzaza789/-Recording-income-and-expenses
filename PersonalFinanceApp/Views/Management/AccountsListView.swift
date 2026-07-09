import SwiftUI
import SwiftData

struct AccountsListView: View {
    @Query private var accounts: [Account]
    @State private var showingAddAccount = false
    
    var body: some View {
        List {
            ForEach(accounts) { account in
                HStack {
                    VStack(alignment: .leading) {
                        Text(account.name).font(.headline)
                        Text(account.accountType.capitalized).font(.subheadline).foregroundColor(.secondary)
                    }
                    Spacer()
                    Text("฿\(account.currentBalance, specifier: "%.2f")")
                        .font(.headline)
                        .foregroundColor(account.currentBalance >= 0 ? .green : .red)
                }
            }
        }
        .overlay {
            if accounts.isEmpty {
                Text("No accounts yet. Add one!")
                    .foregroundColor(.secondary)
            }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: { showingAddAccount = true }) {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingAddAccount) {
            AccountFormView()
        }
    }
}
