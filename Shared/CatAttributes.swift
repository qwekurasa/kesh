import ActivityKit
import Foundation

enum Mood: String, Codable, Hashable {
    case sleep, idle, happy, hungry

    var face: String {
        switch self {
        case .sleep: "😴"
        case .idle: "🐱"
        case .happy: "😻"
        case .hungry: "🙀"
        }
    }

    var text: String {
        switch self {
        case .sleep: "Спит"
        case .idle: "Смотрит"
        case .happy: "Мурчит"
        case .hungry: "Хочет есть"
        }
    }
}

struct CatAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var mood: Mood
        var fedAt: Date
    }
    var name: String
}

extension CatAttributes.ContentState {
    static let hungerDuration: TimeInterval = 4 * 3600
    var hungryAt: Date { fedAt.addingTimeInterval(Self.hungerDuration) }
}
