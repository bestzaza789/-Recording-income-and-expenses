import SwiftUI
import SwiftData

struct ManagementView: View {
    @State private var selectedTab = 0 // 0: Accounts, 1: Categories
    
    var body: some View {
        NavigationStack {
            VStack {
                Picker("Management Tab", selection: $selectedTab) {
                    Text("Accounts").tag(0)
                    Text("Categories").tag(1)
                }
                .pickerStyle(.segmented)
                .padding()
                
                if selectedTab == 0 {
                    AccountsListView()
                } else {
                    CategoriesListView()
                }
                
                Spacer()
            }
            .navigationTitle("Management")
        }
    }
}
