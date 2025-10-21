declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface UserOptions {
    head?: any[][];
    body?: any[][];
    foot?: any[][];
    startY?: number;
    margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
    theme?: 'striped' | 'grid' | 'plain';
    headStyles?: any;
    bodyStyles?: any;
    footStyles?: any;
    columnStyles?: { [key: number]: any };
    [key: string]: any;
  }

  function autoTable(doc: jsPDF, options: UserOptions): jsPDF;

  export default autoTable;
  export { UserOptions };
}
