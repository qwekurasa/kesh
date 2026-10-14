import ActivityKit
import AppIntents

private func updateAll(_ change: (inout CatAttributes.ContentState) -> Void) async {
    for activity in Activity<CatAttributes>.activities {
        var state = activity.content.state
        change(&state)
        await activity.update(.init(state: state, staleDate: state.hungryAt))
    }
}

struct FeedIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Покормить"
    func perform() async throws -> some IntentResult {
        await updateAll { $0.mood = .happy; $0.fedAt = .now }
        return .result()
    }
}

struct PetIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Погладить"
    func perform() async throws -> some IntentResult {
        await updateAll { $0.mood = .happy }
        return .result()
    }
}

struct SleepIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Уложить"
    func perform() async throws -> some IntentResult {
        await updateAll { $0.mood = $0.mood == .sleep ? .idle : .sleep }
        return .result()
    }
}
