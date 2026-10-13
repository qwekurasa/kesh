import SwiftUI

@main
struct KeshApp: App {
    var body: some Scene {
        WindowGroup {
            WebView(url: URL(string: "https://qwekurasa.github.io/kesh/")!)
                .ignoresSafeArea()
                .background(Color(red: 9 / 255, green: 9 / 255, blue: 10 / 255))
                .preferredColorScheme(.dark)
        }
    }
}
