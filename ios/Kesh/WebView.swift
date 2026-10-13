import SwiftUI
import WebKit

// Оболочка над PWA: веб-приложение открывается на весь экран, данные живут внутри WKWebView
struct WebView: UIViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
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
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
        private var downloadURL: URL?

        // Внешние ссылки (GitHub и т. п.) открываем в Safari
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if action.shouldPerformDownload { return decisionHandler(.download) }
            if let url = action.request.url, let host = url.host, host != "qwekurasa.github.io", url.scheme?.hasPrefix("http") == true {
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
