import ActivityKit
import AppIntents

private func setMood(_ mood: Mood, fed: Bool = false) async {
    for activity in Activity<CatAttributes>.activities {
        var state = activity.content.state
        state.mood = mood
        if fed { state.fedAt = .now }
        await activity.update(.init(state: state, staleDate: state.hungryAt))
    }
}

private func react(_ moods: [Mood], fed: Bool = false, end: Mood = .idle) async {
    for (i, mood) in moods.enumerated() {
        await setMood(mood, fed: fed && i == 0)
        try? await Task.sleep(for: .milliseconds(mood == .blink ? 250 : 2200))
    }
    await setMood(end)
}

struct FeedIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Покормить"
    func perform() async throws -> some IntentResult {
        Pet.touch(PetKeys.fedAt)
        await react([.surprised, .happy], fed: true)
        return .result()
    }
}

struct PetIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Погладить"
    func perform() async throws -> some IntentResult {
        Pet.touch(PetKeys.playedAt)
        await react([.blink, .love])
        return .result()
    }
}

struct SleepIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Уложить"
    func perform() async throws -> some IntentResult {
        let asleep = Activity<CatAttributes>.activities.first?.content.state.mood == .sleep
        if asleep {
            await react([.blink, .surprised])
        } else {
            Pet.touch(PetKeys.sleptAt)
            await react([.blink], end: .sleep)
        }
        return .result()
    }
}
