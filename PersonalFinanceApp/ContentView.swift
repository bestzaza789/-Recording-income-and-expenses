import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            Text("Dashboard")
                .tabItem {
                    Label("Dashboard", systemImage: "chart.pie.fill")
                }
            
            Text("Transactions")
                .tabItem {
                    Label("Transactions", systemImage: "list.bullet.rectangle")
                }
            
            Text("Management")
                .tabItem {
                    Label("Management", systemImage: "folder.fill")
                }
            
            Text("Analytics")
                .tabItem {
                    Label("Analytics", systemImage: "chart.bar.fill")
                }
        }
    }
}

#Preview {
    ContentView()
}
