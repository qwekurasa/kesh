import SwiftUI
import WebKit
import WidgetKit

let appGroup = "group.io.github.qwekurasa.kesh"

// Действие из виджета (kesh://out и т. п.), ждёт, пока страница загрузится
final class DeepLink: ObservableObject {
    static let shared = DeepLink()
    @Published var action: String?
}

// Состояние загрузки: заставка, пока страница не открылась, или ошибка с повтором
final class LoadState: ObservableObject {
    static let shared = LoadState()
    @Published var loading = true
    @Published var error: String?
    var retry: (() -> Void)?
}

// Оболочка над PWA: веб-приложение открывается на весь экран, данные живут внутри WKWebView
struct WebView: UIViewRepresentable {
    let url: URL

    @ObservedObject var link = DeepLink.shared

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: "keshWidget")
        config.limitsNavigationsToAppBoundDomains = true // нужно для Service Worker
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true

        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        view.isOpaque = false
        view.backgroundColor = UIColor(red: 9 / 255, green: 9 / 255, blue: 10 / 255, alpha: 1)
        view.scrollView.backgroundColor = view.backgroundColor
        view.scrollView.contentInsetAdjustmentBehavior = .never // отступы под чёлку считает сам CSS
        view.scrollView.bounces = false
        view.allowsBackForwardNavigationGestures = false
        #if DEBUG
        if #available(iOS 16.4, *) { view.isInspectable = true } // отладка через Safari → Разработка
        #endif
        view.load(URLRequest(url: url))
        LoadState.shared.retry = { [weak view] in
            LoadState.shared.error = nil
            LoadState.shared.loading = true
            view?.load(URLRequest(url: url))
        }
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {
        context.coordinator.web = view
        if let a = link.action {
            context.coordinator.pending = a
            DispatchQueue.main.async { link.action = nil }
            context.coordinator.runPending()
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate, WKScriptMessageHandler {
        private var downloadURL: URL?
        weak var web: WKWebView?
        var pending: String?

        // Веб-код открывает экран, как только загрузится
        func runPending() {
            guard let a = pending, let web, ["out", "in", "charts", "budget", "deposits"].contains(a) else { return }
            pending = nil
            web.evaluateJavaScript("(function t(n){if(window.keshOpen)keshOpen('\(a)');else if(n)setTimeout(function(){t(n-1)},200)})(30)")
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            LoadState.shared.loading = false
            runPending()
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { failed(error) }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { failed(error) }

        private func failed(_ error: Error) {
            if (error as NSError).code == NSURLErrorCancelled { return }
            LoadState.shared.loading = false
            LoadState.shared.error = error.localizedDescription
        }

        // Процесс страницы выгружен системой — перезагружаем, иначе останется чёрный экран
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }

        // Сводка для виджета
        func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "keshWidget", let json = message.body as? String else { return }
            UserDefaults(suiteName: appGroup)?.set(json, forKey: "summary")
            WidgetCenter.shared.reloadAllTimelines()
        }

        // Внешние ссылки (GitHub и т. п.) открываем в Safari
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if action.shouldPerformDownload { return decisionHandler(.download) }
            if let url = action.request.url, let host = url.host, host != "kesh-money.vercel.app", url.scheme?.hasPrefix("http") == true {
                UIApplication.shared.open(url)
                return decisionHandler(.cancel)
            }
            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
            decisionHandler(response.canShowMIMEType ? .allow : .download)
        }

        // target="_blank"
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url { UIApplication.shared.open(url) }
            return nil
        }

        // Резервная копия и Excel скачиваются как blob — сохраняем во временный файл и показываем «Поделиться»
        func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
        func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }

        func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(suggestedFilename)
            try? FileManager.default.removeItem(at: url)
            downloadURL = url
            completionHandler(url)
        }

        func downloadDidFinish(_ download: WKDownload) {
            guard let url = downloadURL else { return }
            DispatchQueue.main.async {
                let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
                let root = UIApplication.shared.connectedScenes
                    .compactMap { ($0 as? UIWindowScene)?.keyWindow?.rootViewController }.first
                sheet.popoverPresentationController?.sourceView = root?.view
                root?.present(sheet, animated: true)
            }
        }

        // Диалоги confirm/alert из веб-кода (на случай, если появятся)
        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            completionHandler()
        }
    }
}
