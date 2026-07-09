import SwiftUI
import SwiftData

struct AccountFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    @State private var name = ""
    @State private var accountType = "bank"
    @State private var initialBalance: Double = 0.0
    
    let types = ["cash", "bank", "credit"]
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Account Details")) {
                    TextField("Name", text: $name)
                    Picker("Type", selection: $accountType) {
                        ForEach(types, id: \.self) { type in
                            Text(type.capitalized).tag(type)
                        }
                    }
                    TextField("Initial Balance", value: $initialBalance, format: .number)
                        .keyboardType(.decimalPad)
                }
            }
            .navigationTitle("New Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveAccount()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }
    
    private func saveAccount() {
        let newAccount = Account(name: name, accountType: accountType, initialBalance: initialBalance)
        modelContext.insert(newAccount)
        dismiss()
    }
}
