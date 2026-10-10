const fs = require("fs");
const path = require("path");
const {
  IOSConfig,
  withAppDelegate,
  withInfoPlist,
  withXcodeProject,
} = require("@expo/config-plugins");

const SCENE_DELEGATE_FILE = "SceneDelegate.swift";
const SCENE_DELEGATE_CLASS = "SceneDelegate";

const SCENE_DELEGATE_SOURCE = `internal import Expo

@objc(${SCENE_DELEGATE_CLASS})
class ${SCENE_DELEGATE_CLASS}: ExpoAppSceneDelegate {}
`;

const APP_DELEGATE_WINDOW_STARTUP = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;

/**
 * iOS 27 terminates apps that still create their window from the app delegate.
 * Expo ships ExpoAppSceneDelegate for this; the bare template does not wire it up.
 */
function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
          },
        ],
      },
    };
    return config;
  });

  config = withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes("ExpoReactNativeFactoryProvider")) {
      const declaration = "class AppDelegate: ExpoAppDelegate {";
      if (!contents.includes(declaration)) {
        throw new Error(
          "withIosSceneLifecycle: could not find the AppDelegate declaration to update",
        );
      }
      contents = contents.replace(
        declaration,
        "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {",
      );
    }
    if (contents.includes(APP_DELEGATE_WINDOW_STARTUP)) {
      contents = contents.replace(APP_DELEGATE_WINDOW_STARTUP, "");
    } else if (contents.includes("UIWindow(frame: UIScreen.main.bounds)")) {
      throw new Error(
        "withIosSceneLifecycle: AppDelegate still creates a UIWindow, but the expected startup block changed",
      );
    }
    config.modResults.contents = contents;
    return config;
  });

  config = withXcodeProject(config, (config) => {
    const projectName = config.modRequest.projectName;
    const sourceRoot = path.join(
      config.modRequest.platformProjectRoot,
      projectName,
    );
    fs.mkdirSync(sourceRoot, { recursive: true });
    fs.writeFileSync(
      path.join(sourceRoot, SCENE_DELEGATE_FILE),
      SCENE_DELEGATE_SOURCE,
    );
    config.modResults = IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath: path.join(projectName, SCENE_DELEGATE_FILE),
      groupName: projectName,
      project: config.modResults,
    });
    return config;
  });

  return config;
}

module.exports = withIosSceneLifecycle;
