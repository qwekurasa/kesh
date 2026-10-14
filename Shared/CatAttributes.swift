import ActivityKit
import Foundation

enum Mood: String, Codable, Hashable {
    case idle, blink, happy, love, sleep, hungry, surprised, sad, lookLeft, lookRight

    var text: String {
        switch self {
        case .idle: "Смотрит"
        case .blink: "Моргает"
        case .happy: "Доволен"
        case .love: "Мурчит"
        case .sleep: "Спит"
        case .hungry: "Хочет есть"
        case .surprised: "Удивлён"
        case .sad: "Скучает"
        case .lookLeft, .lookRight: "Оглядывается"
        }
    }
}

struct CatAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var mood: Mood
        var black: Bool
        var fedAt: Date
    }
    var name: String
}

extension CatAttributes.ContentState {
    var hungryAt: Date { fedAt.addingTimeInterval(Pet.hungerSpan) }
}

enum PetKeys {
    static let name = "name"
    static let black = "black"
    static let bornAt = "bornAt"
    static let fedAt = "fedAt"
    static let cleanedAt = "cleanedAt"
    static let sleptAt = "sleptAt"
    static let playedAt = "playedAt"
}

enum Pet {
    static let hungerSpan: TimeInterval = 4 * 3600

    static func touch(_ key: String) {
        UserDefaults.standard.set(Date.now.timeIntervalSince1970, forKey: key)
    }
}
