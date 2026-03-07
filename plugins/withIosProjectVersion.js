const { withXcodeProject } = require('@expo/config-plugins/build/plugins/ios-plugins');
const { getNativeTargets } = require('@expo/config-plugins/build/ios/Target');
const { getBuildConfigurationsForListId } = require('@expo/config-plugins/build/ios/utils/Xcodeproj');

/**
 * Expo only writes ios.buildNumber to Info.plist (CFBundleVersion).
 * Xcode's General → Build reads CURRENT_PROJECT_VERSION from the project file.
 * This plugin sets CURRENT_PROJECT_VERSION so Xcode shows the same build number.
 */
function withIosProjectVersion(config) {
  const buildNumber = config.ios?.buildNumber ?? '1';
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const nativeTargets = getNativeTargets(project);
    nativeTargets.forEach(([, nativeTarget]) => {
      getBuildConfigurationsForListId(project, nativeTarget.buildConfigurationList).forEach(
        ([, buildConfig]) => {
          if (buildConfig.buildSettings) {
            buildConfig.buildSettings.CURRENT_PROJECT_VERSION = buildNumber;
          }
        }
      );
    });
    config.modResults = project;
    return config;
  });
}

module.exports = withIosProjectVersion;
