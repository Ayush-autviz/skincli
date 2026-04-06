import React from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { StyleSheet, View } from 'react-native';

const HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <script type="module" src="https://liqa.haut.ai/liqa.js"></script>
    <style>
      * { margin: 0; padding: 0; }
      html, body { width: 100%; height: 100%; background: black; }
    </style>
  </head>
  <body>
    <hautai-liqa license="eyJpZCI6IkhBVVQtMjUwMjAxMTQtMCJ9" preset="face-180"></hautai-liqa>
    <script>
      // Get LIQA element
      const liqa = document.querySelector('hautai-liqa');

      // Face-180 side → SaaS side-ID mapping  (front=1, right=2, left=3)
      const SIDE_ID_MAP = { front: 1, right: 2, left: 3 };
      
      // Listen for captures event
      liqa.addEventListener('captures', async (event) => {
        try {
          // event.detail is an array of capture objects.
          // Each capture has a .blob() method and metadata including .side
          const captureResults = await Promise.all(
            event.detail.map(async (capture) => {
              const blob = await capture.blob();
              const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
              // capture.side is 'front' | 'right' | 'left' (face-180 preset)
              const side = capture.side || 'front';
              return {
                base64,
                side,
                sideId: SIDE_ID_MAP[side] ?? 1,
              };
            })
          );

          // Send to React Native
          window.ReactNativeWebView.postMessage(JSON.stringify({
            name: 'captures',
            payload: {
              captures: captureResults
            }
          }));
        } catch (error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            name: 'error',
            payload: {
              message: error.message
            }
          }));
        }
      });

      // Forward all other LIQA events
      liqa.addEventListener('*', (event) => {
        if (event.type !== 'captures') {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            name: event.type,
            payload: event.detail
          }));
        }
      });
    </script>
  </body>
</html>
`;

/** A single captured face image from the face-180 preset. */
export type FaceCapture = {
  /** Base64-encoded data URL of the captured image. */
  base64: string;
  /** Logical side: 'front' | 'right' | 'left' */
  side: 'front' | 'right' | 'left';
  /** SaaS Side ID: front=1, right=2, left=3 */
  sideId: 1 | 2 | 3;
};

export type Props = {
  onLiqaEvent: (name: string, payload?: any) => void;
};

export const LiqaWebView = ({ onLiqaEvent }: Props) => {
  const handleWebviewMessage = (event: WebViewMessageEvent) => {
    try {
      const message = event.nativeEvent.data;
      console.log('📡 LIQA Raw Message:', message);
      const { name, payload } = JSON.parse(message);
      onLiqaEvent(name, payload);
    } catch (error) {
      console.error('🔴 LIQA Error parsing message:', error);
      console.log('Raw message content:', event.nativeEvent.data);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{
          html: HTML,
          // `https://` is required to get WebView camera working
          baseUrl: "https://localhost/",
        }}
        originWhitelist={["*"]}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        onMessage={handleWebviewMessage}
        // Set the mediaCapturePermissionGrantType to "grant" to avoid repetitive permission requests, especially on iOS
        mediaCapturePermissionGrantType={"grant"}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
