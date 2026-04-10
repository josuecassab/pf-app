const { execSync } = require('child_process');
const base = require('./app.json');

/**
 * Gets the number of commits in the current branch (used for build numbers).
 * Falls back to 1 if not in a git repo or git is unavailable.
 */
function getCommitCount() {
  try {
    const count = execSync('git rev-list --count HEAD', {
      encoding: 'utf8',
    }).trim();
    return Math.max(1, parseInt(count, 10));
  } catch {
    return 1;
  }
}

const commitCount = getCommitCount();

module.exports = {
  expo: {
    ...base.expo,
    ios: {
      ...base.expo.ios,
      buildNumber: String(commitCount),
    },
    android: {
      ...base.expo.android,
      versionCode: commitCount,
    },
    plugins: [
      ...(base.expo.plugins ?? []),
      '@react-native-community/datetimepicker',
      'expo-font',
      'expo-image',
      'expo-web-browser',
      './plugins/withIosProjectVersion.js',
    ],
  },
};
