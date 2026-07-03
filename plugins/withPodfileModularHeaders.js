const { withPodfile } = require('@expo/config-plugins/build/plugins/ios-plugins');

/**
 * GoogleSignIn's Swift pod (AppCheckCore) depends on GoogleUtilities and
 * RecaptchaInterop, neither of which define modules. Without modular headers,
 * `pod install` fails: "cannot yet be integrated as static libraries".
 */
function withPodfileModularHeaders(config) {
  return withPodfile(config, (config) => {
    const marker = "use_expo_modules!";
    const injected = [
      marker,
      "  pod 'GoogleUtilities', :modular_headers => true",
      "  pod 'RecaptchaInterop', :modular_headers => true",
    ].join('\n');

    if (!config.modResults.contents.includes(marker)) {
      throw new Error('withPodfileModularHeaders: could not find `use_expo_modules!` in Podfile');
    }

    config.modResults.contents = config.modResults.contents.replace(marker, injected);
    return config;
  });
}

module.exports = withPodfileModularHeaders;
