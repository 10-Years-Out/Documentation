export const PrintRecordButton = () => {
  const printRecord = () => window.print();

  return (
    <button
      type="button"
      onClick={printRecord}
      className="audit-print-button my-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
    >
      Print or save as PDF
    </button>
  );
};
