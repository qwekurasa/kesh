import SwiftUI

@main
struct KeshApp: App {
    @ObservedObject var load = LoadState.shared

    var body: some Scene {
        WindowGroup {
            ZStack {
                WebView(url: URL(string: "https://kesh-money.vercel.app/")!)
                    .ignoresSafeArea()
                if load.loading || load.error != nil { Splash(load: load) }
            }
            .background(Color(red: 9 / 255, green: 9 / 255, blue: 10 / 255).ignoresSafeArea())
            .preferredColorScheme(.dark)
            .onOpenURL { url in
                if url.scheme == "kesh" { DeepLink.shared.action = url.host }
            }
        }
    }
}

// Заставка на время первой загрузки; при ошибке — текст и «Повторить»
struct Splash: View {
    @ObservedObject var load: LoadState

    var body: some View {
        VStack(spacing: 18) {
            Image("Logo").resizable().frame(width: 88, height: 88).clipShape(RoundedRectangle(cornerRadius: 22))
            if let error = load.error {
                Text("Не удалось открыть Кэш").font(.headline).foregroundStyle(.white)
                Text(error).font(.footnote).foregroundStyle(.gray).multilineTextAlignment(.center).padding(.horizontal, 32)
                Button("Повторить") { load.retry?() }
                    .padding(.horizontal, 22).padding(.vertical, 10)
                    .background(Color.white.opacity(0.1), in: Capsule()).foregroundStyle(.white)
            } else {
                ProgressView().tint(.gray)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(red: 9 / 255, green: 9 / 255, blue: 10 / 255).ignoresSafeArea())
        .transition(.opacity)
    }
}
