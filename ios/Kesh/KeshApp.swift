import SwiftUI

@main
struct KeshApp: App {
    var body: some Scene {
        WindowGroup {
            WebView(url: URL(string: "https://kesh-money.vercel.app/")!)
                .ignoresSafeArea()
                .background(Color(red: 9 / 255, green: 9 / 255, blue: 10 / 255))
                .preferredColorScheme(.dark)
                .onOpenURL { url in
                    if url.scheme == "kesh" { DeepLink.shared.action = url.host }
                }
        }
    }
}
