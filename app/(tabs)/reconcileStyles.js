import { StyleSheet } from "react-native";

export const reconcileStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 16,
  },
  headerSection: {
    paddingVertical: 16,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  fileInfo: {
    padding: 15,
    borderRadius: 8,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 1,
    borderWidth: 1,
  },
  fileLabel: {
    fontWeight: "600",
    marginTop: 10,
  },
  fileValue: {
    marginTop: 2,
  },
  filePickAndUploadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filePickButton: {
    flex: 1,
    minWidth: 0,
  },
  filePickBar: {
    flexDirection: "row",
    alignItems: "center",
  },
  filePickBarMain: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  filePickBarPressed: {
    opacity: 0.85,
  },
  filePickClearHit: {
    marginLeft: 4,
    padding: 2,
    justifyContent: "center",
  },
  uploadBankHint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  selectBlock: {
    marginTop: 12,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  statementRow: {
    gap: 8,
    alignItems: "stretch",
    marginTop: 12,
  },
  statementActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statementDropdownFlex: {
    flex: 1,
    minWidth: 0,
  },
  bankDropdown: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  uploadButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  uploadButtonPressed: {
    opacity: 0.8,
  },
  uploadButtonText: {
    fontWeight: "600",
    fontSize: 16,
    color: "#ffffff",
  },
  scrollView: {
    borderWidth: 1,
    borderRadius: 8,
  },
  flatList: {
    borderRadius: 8,
  },
  unmatchedSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontWeight: "600",
    fontSize: 20,
  },
  matchedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  completeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  completeButtonPressed: {
    opacity: 0.8,
  },
  row: {
    flexDirection: "row",
  },
  colDate: { width: 98 },
  colDescription: { width: 144 },
  colAmount: { width: 112 },
  colBalance: { width: 112 },
  colBanco: { width: 80 },
  headerCell: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
    justifyContent: "center",
    padding: 8,
  },
  headerText: {
    fontWeight: "bold",
    textAlign: "right",
  },
  cell: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
    padding: 8,
  },
  cellText: {
    textAlign: "right",
  },
  footer: {
    paddingVertical: 16,
  },
  wizardScrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  wizardStep: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  wizardStepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  wizardStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  wizardStepBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  wizardStepTitles: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  wizardStepTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  wizardStepSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  wizardStepBody: {
    gap: 8,
  },
  bankChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  bankChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  previewToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    gap: 8,
  },
  previewToggleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  previewTableWrap: {
    maxHeight: 320,
    marginTop: 4,
  },
  wizardEmptyHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  footerCta: {
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerCtaButton: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  footerCtaButtonDisabled: {
    opacity: 0.5,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  summaryMeta: {
    fontSize: 15,
    fontWeight: "600",
  },
  summaryStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryStatChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  summaryStatChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  blockerBanner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  blockerBannerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  blockerBannerContent: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  blockerBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  blockerBannerMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  blockerBannerAction: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  blockerBannerActionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  destructiveActionButton: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  destructiveActionButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  completeHint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
