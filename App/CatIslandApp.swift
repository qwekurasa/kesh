import ActivityKit
import SwiftUI

@main
struct CatIslandApp: App {
    var body: some Scene {
        WindowGroup { ContentView() }
    }
}

struct ContentView: View {
    @State private var running = !Activity<CatAttributes>.activities.isEmpty
    @State private var error: String?

    var body: some View {
        VStack(spacing: 16) {
            Text(running ? "Кот в островке" : "Кот спит в приложении")
                .font(.title2.bold())
            Button(running ? "Убрать из островка" : "Посадить в островок") {
                Task { running ? await stop() : start() }
            }
            .buttonStyle(.borderedProminent)
            if let error { Text(error).foregroundStyle(.red).font(.footnote) }
        }
        .padding()
    }

    private func start() {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            error = "Live Activities выключены в Настройках"
            return
        }
        let state = CatAttributes.ContentState(mood: .idle, fedAt: .now)
        do {
            _ = try Activity.request(
                attributes: CatAttributes(name: "Мурзик"),
                content: .init(state: state, staleDate: state.hungryAt)
            )
            running = true
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func stop() async {
        for activity in Activity<CatAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        running = false
    }
}
