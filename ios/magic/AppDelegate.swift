import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Firebase
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Configure Firebase
    FirebaseApp.configure()

    // Set up React Native bridge
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
    reactNativeDelegate = delegate
    reactNativeFactory = factory

    // Setup main window
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "magic",
      in: window,
      launchOptions: launchOptions
    )

    // ✅ Request permission for notifications
    UNUserNotificationCenter.current().delegate = self
    requestNotificationAuthorization(application: application)

    // ✅ Register for remote notifications
    DispatchQueue.main.async {
      application.registerForRemoteNotifications()
    }

    return true
  }

  // MARK: - Notification Permission
  private func requestNotificationAuthorization(application: UIApplication) {
    let center = UNUserNotificationCenter.current()
    center.delegate = self
    center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
      if let error = error {
        print("❌ Notification permission error: \(error.localizedDescription)")
      } else {
        print("✅ Notification permission granted: \(granted)")
      }
    }
  }

  // MARK: - APNs Token Registration
  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    print("🍏 APNs Token received: \(deviceToken.map { String(format: "%02.2hhx", $0) }.joined())")
    // ✅ Link APNs token to Firebase Messaging
    Messaging.messaging().apnsToken = deviceToken
  }

  func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("❌ Failed to register for remote notifications: \(error.localizedDescription)")
  }

  // MARK: - FCM Token Updates
  func applicationDidBecomeActive(_ application: UIApplication) {
    Messaging.messaging().token { token, error in
      if let error = error {
        print("❌ Error fetching FCM token: \(error.localizedDescription)")
      } else if let token = token {
        print("🔥 FCM Token: \(token)")
      }
    }
  }

  // MARK: - Foreground Notification Handling
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    print("📬 Notification received in foreground: \(notification.request.content.userInfo)")
    // Show notification even in foreground
    completionHandler([.banner, .sound, .badge])
  }

  // MARK: - Background Notification Tap Handling
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let userInfo = response.notification.request.content.userInfo
    print("📨 Notification tapped: \(userInfo)")
    completionHandler()
  }
}

// MARK: - React Native Delegate
class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
