import SwiftUI
import SwiftData

struct TransferFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    @Query private var accounts: [Account]
    
    @State private var amount: Double = 0.0
    @State private var date = Date()
    @State private var fromAccount: Account?
    @State private var toAccount: Account?
    @State private var note = ""
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Transfer Details")) {
                    TextField("Amount (฿)", value: $amount, format: .number)
                        .keyboardType(.decimalPad)
                    
                    DatePicker("Date", selection: $date, displayedComponents: .date)
                }
                
                Section(header: Text("Accounts")) {
                    Picker("From", selection: $fromAccount) {
                        Text("Select Source").tag(Account?.none)
                        ForEach(accounts) { account in
                            Text(account.name).tag(Account?.some(account))
                        }
                    }
                    
                    Picker("To", selection: $toAccount) {
                        Text("Select Destination").tag(Account?.none)
                        ForEach(accounts) { account in
                            if account != fromAccount {
                                Text(account.name).tag(Account?.some(account))
                            }
                        }
                    }
                }
                
                Section(header: Text("Note (Optional)")) {
                    TextField("Note", text: $note)
                }
            }
            .navigationTitle("Transfer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveTransfer()
                    }
                    .disabled(amount <= 0 || fromAccount == nil || toAccount == nil || fromAccount == toAccount)
                }
            }
            .onAppear {
                if fromAccount == nil { fromAccount = accounts.first }
            }
        }
    }
    
    private func saveTransfer() {
        guard let source = fromAccount, let destination = toAccount else { return }
        TransactionManager.shared.addTransaction(
            amount: amount,
            type: "transfer",
            date: date,
            note: note.isEmpty ? nil : note,
            account: source,
            toAccount: destination,
            category: nil,
            context: modelContext
        )
        dismiss()
    }
}
