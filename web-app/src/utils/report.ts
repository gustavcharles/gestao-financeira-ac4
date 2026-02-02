import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './finance';
import type { Transaction } from './finance';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const generateTransactionReport = (transactions: Transaction[], title: string) => {
    const doc = new jsPDF();

    // -- Header --
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text("Gestão Financeira AC-4", 14, 20);

    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(title, 14, 30);

    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 38);

    // -- Summary Calculations --
    const receitas = transactions
        .filter(t => t.tipo === 'Receita')
        .reduce((acc, curr) => acc + Number(curr.valor), 0);

    const despesas = transactions
        .filter(t => t.tipo === 'Despesa')
        .reduce((acc, curr) => acc + Number(curr.valor), 0);

    const saldo = receitas - despesas;

    // -- Summary Section --
    const summaryY = 50;
    doc.setDrawColor(226, 232, 240); // Border color
    doc.setFillColor(248, 250, 252); // Background
    doc.roundedRect(14, 45, 180, 25, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Receitas", 20, summaryY);
    doc.text("Despesas", 80, summaryY);
    doc.text("Saldo Final", 140, summaryY);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");

    doc.setTextColor(16, 185, 129); // Emerald 500
    doc.text(formatCurrency(receitas), 20, summaryY + 8);

    doc.setTextColor(239, 68, 68); // Red 500
    doc.text(formatCurrency(despesas), 80, summaryY + 8);

    doc.setTextColor(saldo >= 0 ? 16 : 239, saldo >= 0 ? 185 : 68, saldo >= 0 ? 129 : 68);
    doc.text(formatCurrency(saldo), 140, summaryY + 8);

    // -- Table --
    const tableData = transactions.map(t => [
        format(parseISO(t.data), 'dd/MM/yyyy'),
        t.descricao,
        t.categoria,
        t.tipo,
        formatCurrency(t.valor),
        t.status
    ]);

    autoTable(doc, {
        startY: 75,
        head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Status']],
        body: tableData,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [51, 65, 85]
        },
        headStyles: {
            fillColor: [59, 130, 246], // Blue 500
            textColor: 255,
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: {
            4: { halign: 'right', fontStyle: 'bold' }, // Valor alignment
            5: { halign: 'center' } // Status alignment
        },
        didParseCell: (data) => {
            // Conditional formatting for Value column
            if (data.section === 'body' && data.column.index === 4) {
                const rawRow = data.row.raw as unknown as any[];
                const isExpense = rawRow[3] === 'Despesa'; // Index 3 is Tipo
                if (isExpense) {
                    data.cell.styles.textColor = [239, 68, 68];
                } else {
                    data.cell.styles.textColor = [16, 185, 129];
                }
            }
        }
    });

    // Save
    doc.save(`relatorio_${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
};

export const generateDetailedReport = (transactions: Transaction[], month: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // -- 1. Title Page / Header --
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setFontSize(22);
    doc.setTextColor(255);
    doc.text("Relatório Mensal Detalhado", 14, 20);
    doc.setFontSize(14);
    doc.setTextColor(148, 163, 184);
    doc.text(month, 14, 30);

    const now = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
    doc.setFontSize(10);
    doc.text(`Gerado em: ${now}`, pageWidth - 50, 20);

    // -- 2. Financial Summary --
    const ySummary = 55;

    const receitas = transactions
        .filter(t => t.tipo === 'Receita')
        .reduce((acc, curr) => acc + Number(curr.valor), 0);

    const despesas = transactions
        .filter(t => t.tipo === 'Despesa')
        .reduce((acc, curr) => acc + Number(curr.valor), 0);

    const saldo = receitas - despesas;

    // Draw Summary Boxes
    const drawBox = (x: number, label: string, value: number, color: [number, number, number]) => {
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(255, 255, 255); // White explicit
        doc.roundedRect(x, ySummary, 55, 30, 2, 2, 'FD');

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100); // Gray explicit
        doc.text(String(label), x + 5, ySummary + 8);

        doc.setFontSize(14);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFont("helvetica", "bold");
        doc.text(String(formatCurrency(value)), x + 5, ySummary + 20);
    };

    drawBox(14, "Total Receitas", receitas, [16, 185, 129]); // Emerald
    drawBox(76, "Total Despesas", despesas, [239, 68, 68]); // Red
    drawBox(138, "Saldo Líquido", saldo, saldo >= 0 ? [16, 185, 129] : [239, 68, 68]);

    // -- 3. Visual Breakdown (Simulated Charts) --
    // Top Categories Bar Chart
    let yChart = 100;
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text("Distribuição de Despesas por Categoria", 14, yChart);

    const catMap = new Map<string, number>();
    transactions.filter(t => t.tipo === 'Despesa').forEach(t => {
        catMap.set(t.categoria, (catMap.get(t.categoria) || 0) + t.valor);
    });

    const sortedCats = Array.from(catMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5

    const maxVal = sortedCats.length > 0 ? sortedCats[0][1] : 1;
    let barY = yChart + 15;

    sortedCats.forEach(([cat, val]) => {
        const barWidth = (val / maxVal) * 100; // Max width 100mm

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text(cat, 14, barY + 4);

        // Bar bg
        doc.setFillColor(241, 245, 249);
        doc.rect(50, barY - 1, 100, 6, 'F');

        // Bar fg
        doc.setFillColor(59, 130, 246); // Blue 500
        doc.rect(50, barY - 1, barWidth, 6, 'F');

        // Value
        doc.text(formatCurrency(val), 155, barY + 4);

        barY += 10;
    });

    if (sortedCats.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.text("Sem despesas registradas neste período.", 14, barY + 5);
        barY += 10;
    }

    // -- 4. Detailed Table --
    const tableData = transactions.map(t => [
        t.data.split('-').reverse().join('/'), // Simple format
        t.descricao,
        t.categoria,
        t.tipo,
        formatCurrency(t.valor)
    ]);

    autoTable(doc, {
        startY: barY + 20,
        head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105] },
        columnStyles: { 4: { halign: 'right' } }
    });

    doc.save(`relatorio_detalhado_${month.replace(/\s/g, '_')}.pdf`);
};
