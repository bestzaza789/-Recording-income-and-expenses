import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.pie.fill")
                }
            
            TransactionsLogView()
                .tabItem {
                    Label("Transactions", systemImage: "list.bullet.rectangle")
                }
            
            ManagementView()
                .tabItem {
                    Label("Management", systemImage: "folder.fill")
                }
            
            AnalyticsView()
                .tabItem {
                    Label("Analytics", systemImage: "chart.bar.fill")
                }
        }
    }
}

#Preview {
    ContentView()
}
