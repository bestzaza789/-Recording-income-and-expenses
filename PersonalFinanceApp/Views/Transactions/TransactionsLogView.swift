import SwiftUI
import SwiftData

struct TransactionsLogView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Transaction.date, order: .reverse) private var transactions: [Transaction]
    
    @State private var searchText = ""
    
    var filteredTransactions: [Transaction] {
        if searchText.isEmpty {
            return transactions
        }
        return transactions.filter {
            ($0.note?.localizedCaseInsensitiveContains(searchText) ?? false) ||
            ($0.category?.name.localizedCaseInsensitiveContains(searchText) ?? false) ||
            ($0.account?.name.localizedCaseInsensitiveContains(searchText) ?? false) ||
            ($0.toAccount?.name.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }
    
    var groupedTransactions: [(Date, [Transaction])] {
        let grouped = Dictionary(grouping: filteredTransactions) { transaction in
            Calendar.current.startOfDay(for: transaction.date)
        }
        return grouped.sorted { $0.key > $1.key }
    }
    
    var body: some View {
        NavigationStack {
            List {
                ForEach(groupedTransactions, id: \.0) { date, items in
                    Section(header: Text(date, style: .date).font(.headline)) {
                        ForEach(items) { transaction in
                            TransactionRowView(transaction: transaction)
                        }
                        .onDelete { indexSet in
                            deleteTransactions(at: indexSet, in: items)
                        }
                    }
                }
            }
            .navigationTitle("Transactions")
            .searchable(text: $searchText, prompt: "Search note, category, or account")
            .overlay {
                if transactions.isEmpty {
                    Text("No transactions yet.")
                        .foregroundColor(.secondary)
                } else if filteredTransactions.isEmpty {
                    Text("No results for '\(searchText)'")
                        .foregroundColor(.secondary)
                }
            }
        }
    }
    
    private func deleteTransactions(at offsets: IndexSet, in items: [Transaction]) {
        for index in offsets {
            let transaction = items[index]
            TransactionManager.shared.deleteTransaction(transaction, context: modelContext)
        }
    }
}
