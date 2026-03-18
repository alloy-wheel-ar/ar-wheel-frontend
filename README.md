# AR Wheel App (Frontend)

This is the frontend mobile application for the AR Wheel project, built using [React Native](https://reactnative.dev).

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your development machine:

*   **Node.js**: Version 18 or higher.
*   **Java Development Kit (JDK)**: Version 17 is recommended for Android builds.
*   **Android Studio**: Properly configured with:
    *   Android SDK
    *   Android SDK Platform
    *   Android Virtual Device (Emulator)
*   **CocoaPods**: Required for iOS development (macOS only).
*   **Ruby**: Required for CocoaPods and Bundler.

## 🚀 Getting Started

### 1. Project Setup

First, clone the repository and install the dependencies:

```bash
# Clone the repository
git clone <repository-url>
cd ar-wheel-frontend

# Install JavaScript dependencies
npm install

# Install Ruby dependencies (for iOS/CocoaPods)
bundle install

# Install iOS dependencies
cd ios
pod install
cd ..
```

### 2. Running the Application

#### Start Metro Bundler
First, start the Metro dev server:

```bash
npm start
```

#### Run on Android
Open a new terminal and run:

```bash
npm run android
```

#### Run on iOS (macOS only)
Open a new terminal and run:

```bash
npm run ios
```

## 📂 Project Structure

*   `src/components`: Reusable UI components.
*   `src/screens`: Main application screens (Login, Home, AR View, etc.).
*   `src/services`: API services and business logic.
*   `src/navigation`: Navigation configuration (Stack/Tab navigators).
*   `src/context`: React Context for state management.
*   `src/constants`: Theme colors, fonts, and global constants.

## 🛠 Tech Stack

*   **Framework**: React Native 0.80.2
*   **State Management**: React Context / Hooks
*   **Networking**: Axios, Socket.io-client
*   **Icons**: React Native Vector Icons (Ionicons)
*   **Storage**: React Native MMKV
*   **Forms**: React Hook Form with Yup validation

## ⚙️ Configuration

### API Base URL
The API endpoint is configured in `src/services/api.ts`:

| Environment        | Base URL                             |
|--------------------|--------------------------------------|
| **Production**     | `https://ar-alloy-api.onrender.com`  |
| **Android Emulator** | `http://10.0.2.2:3000`            |
| **Physical Device** | `http://<your-computer-ip>:3000`   |

> **Note**: If you are running the backend locally, update the `baseURL` in `src/services/api.ts` to match your setup.

## 📝 Troubleshooting

*   **Android Build Fail**: Ensure `ANDROID_HOME` is set in your environment variables and JDK 17 is selected.
*   **Metro Issues**: Clear the cache using `npm start -- --reset-cache`.
*   **iOS Pods**: If you encounter issues, try `cd ios && rm -rf Pods Podfile.lock && pod install`.
