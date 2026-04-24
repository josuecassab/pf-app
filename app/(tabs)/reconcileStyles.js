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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 8,
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
  colFecha: { width: 98 },
  colDescripcion: { width: 144 },
  colValor: { width: 112 },
  colSaldo: { width: 112 },
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
});
