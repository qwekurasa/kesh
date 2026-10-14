import ActivityKit
import AVFoundation

// Live Activity не умеет анимироваться сама. Приложение держится в фоне
// беззвучным аудио и само обновляет островок: моргание и случайные действия.
@MainActor
final class IslandAnimator {
    static let shared = IslandAnimator()

    private var player: AVAudioPlayer?
    private var task: Task<Void, Never>?

    private init() {
        NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification, object: nil, queue: .main
        ) { _ in
            Task { @MainActor in IslandAnimator.shared.player?.play() }
        }
    }

    func start() {
        guard task == nil else { return }
        startAudio()
        task = Task {
            var tick = 0
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(Double.random(in: 3...6)))
                guard let activity = Activity<CatAttributes>.activities.first else { break }
                guard [.idle, .hungry, .sad].contains(activity.content.state.mood) else { continue }
                tick += 1
                if tick % 4 == 0 {
                    let trick = [Mood.lookLeft, .lookRight, .love, .surprised].randomElement() ?? .lookLeft
                    await set(activity, trick)
                    try? await Task.sleep(for: .seconds(1.6))
                } else {
                    await set(activity, .blink)
                    try? await Task.sleep(for: .milliseconds(250))
                }
                await set(activity, Stat.baseMood(at: .now))
            }
            stop()
        }
    }

    func stop() {
        task?.cancel()
        task = nil
        player?.stop()
        player = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    private func set(_ activity: Activity<CatAttributes>, _ mood: Mood) async {
        var state = activity.content.state
        state.mood = mood
        await activity.update(.init(state: state, staleDate: state.hungryAt))
    }

    private func startAudio() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, options: [.mixWithOthers])
        try? session.setActive(true)
        player = try? AVAudioPlayer(data: Self.silence)
        player?.numberOfLoops = -1
        player?.play()
    }

    // 1 секунда тишины в WAV.
    private static let silence: Data = {
        let rate: UInt32 = 8000
        var d = Data()
        func u32(_ v: UInt32) { withUnsafeBytes(of: v.littleEndian) { d.append(contentsOf: $0) } }
        func u16(_ v: UInt16) { withUnsafeBytes(of: v.littleEndian) { d.append(contentsOf: $0) } }
        d.append(contentsOf: Array("RIFF".utf8)); u32(36 + rate * 2)
        d.append(contentsOf: Array("WAVEfmt ".utf8)); u32(16); u16(1); u16(1); u32(rate); u32(rate * 2); u16(2); u16(16)
        d.append(contentsOf: Array("data".utf8)); u32(rate * 2)
        d.append(Data(count: Int(rate * 2)))
        return d
    }()
}
