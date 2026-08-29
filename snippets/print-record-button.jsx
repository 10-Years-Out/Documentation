export const PrintRecordButton = () => {
  const printRecord = () => window.print();

  return (
    <button
      type="button"
      onClick={printRecord}
      className="audit-print-button"
    >
      Print or save as PDF
    </button>
  );
};
