import { logger } from '../lib/logger';
import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/requireAuth';
import { db } from '../lib/db';
import { canAccessTicket } from '../lib/authorization';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const router = Router();

function addCBIHeader(doc: PDFKit.PDFDocument, title: string) {
  // Fundo do cabeçalho agora é branco para casar com a logo em JPG
  doc.rect(0, 0, doc.page.width, 100).fill('#FFFFFF');
  
  // Borda sutil inferior para separar o cabeçalho do conteúdo
  doc.moveTo(0, 100).lineTo(doc.page.width, 100).stroke('#E2E8F0');
  
  // Caminho absoluto para a logo que está na pasta public
  const logoPath = path.join(process.cwd(), 'public', 'logo.jpg');
  
  if (fs.existsSync(logoPath)) {
    // Se a imagem existir, desenha a logo
    doc.image(logoPath, 40, 20, { fit: [120, 60], valign: 'center' });
  } else {
    // Fallback caso a logo seja apagada ou movida no futuro
    doc.fillColor('#004731').fontSize(28).font('Helvetica-Bold').text('AcmeCorp', 40, 30);
    doc.fillColor('#10B981').fontSize(10).font('Helvetica').text('OPS CENTER', 40, 58);
  }
  
  // Título do Relatório
  doc.fillColor('#081B16').fontSize(16).font('Helvetica-Bold').text(title, 200, 40, { align: 'right', width: doc.page.width - 240 });
  
  // Reset de cor para o corpo do relatório
  doc.fillColor('#333333').font('Helvetica');
}

function addCBIFooter(doc: PDFKit.PDFDocument, pageNum: number) {
  doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill('#081B16');
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR');
  
  doc.fillColor('#EF4444').fontSize(8).font('Helvetica-Bold')
     .text(`USO INTERNO E CONFIDENCIAL`, 40, doc.page.height - 25);
     
  doc.fillColor('#94A3B8').fontSize(8).font('Helvetica')
     .text(`AcmeCorp Operations Center • Gerado em: ${dateStr} às ${timeStr} • Página ${pageNum}`, 0, doc.page.height - 25, { align: 'center', width: doc.page.width });
}

router.post('/export/xlsx', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filters = req.body; // Could be used to filter tickets if needed
    const allTickets = await db.getTickets();
    
    // Filter by access
    const accessibleTickets = allTickets.filter(t => canAccessTicket(req.user!, t));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Relatório de Chamados');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Título', key: 'title', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Prioridade', key: 'priority', width: 15 },
      { header: 'Departamento', key: 'department', width: 20 },
      { header: 'Criado Por', key: 'authorEmail', width: 25 },
      { header: 'Atribuído Para', key: 'assignedToEmail', width: 25 },
      { header: 'Data de Criação', key: 'createdAt', width: 20 }
    ];

    const sanitizeCell = (val: string | undefined | null) => {
      if (!val) return val;
      const strVal = String(val);
      if (/^[=+\-@\t\r]/.test(strVal)) {
        return "'" + strVal;
      }
      return strVal;
    };

    accessibleTickets.forEach(t => {
      sheet.addRow({
        id: sanitizeCell(t.id),
        title: sanitizeCell(t.title),
        status: sanitizeCell(t.status),
        priority: sanitizeCell(t.priority),
        department: sanitizeCell(t.department),
        authorEmail: sanitizeCell(t.authorEmail),
        assignedToEmail: sanitizeCell(t.assignedToEmail || 'Não atribuído'),
        createdAt: new Date(t.createdAt)
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-chamados.xlsx"');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
    res.status(500).json({ error: 'Erro ao gerar XLSX' });
  }
});

router.post('/export/pdf', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filters = req.body;
    const allTickets = await db.getTickets();
    const accessibleTickets = allTickets.filter(t => canAccessTicket(req.user!, t));

    const doc = new PDFDocument({ margin: 0, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-chamados.pdf"');
    
    doc.pipe(res);

    let pageNum = 1;
    addCBIHeader(doc, 'Relatório Executivo de Chamados');

    doc.y = 120;
    doc.x = 40;

    accessibleTickets.forEach((t, i) => {
      if (doc.y > doc.page.height - 120) {
        addCBIFooter(doc, pageNum);
        doc.addPage();
        pageNum++;
        addCBIHeader(doc, 'Relatório Executivo de Chamados');
        doc.y = 120;
        doc.x = 40;
      }

      // Card background
      const startY = doc.y;
      doc.rect(40, startY, doc.page.width - 80, 80).fill('#FFFFFF').stroke('#E2E8F0');
      
      doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text(`[${t.id}] ${t.title}`, 50, startY + 15, { width: doc.page.width - 100 });
      
      doc.fillColor('#64748B').fontSize(9).font('Helvetica');
      doc.text(`Status: `, 50, startY + 35, { continued: true }).fillColor('#10B981').text(`${t.status}  `, { continued: true })
         .fillColor('#64748B').text(`|  Prioridade: `, { continued: true }).fillColor(t.priority === 'Alta' ? '#EF4444' : '#F59E0B').text(`${t.priority}  `, { continued: true })
         .fillColor('#64748B').text(`|  Departamento: ${t.department}`);
      
      doc.fillColor('#94A3B8').fontSize(8).text(`Solicitante: ${t.authorEmail}  |  Atribuído: ${t.assignedToEmail || 'N/A'}  |  Criado: ${new Date(t.createdAt).toLocaleString('pt-BR')}`, 50, startY + 55);

      doc.y = startY + 95;
    });

    addCBIFooter(doc, pageNum);
    doc.end();

  } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
    logger.error({ err: error }, 'PDF generation error:');
    res.status(500).json({ error: 'Erro ao gerar PDF' });
  }
});

router.post('/export/devices/pdf', requireAuth, requireRole(['Administrador', 'Suporte']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { devices } = req.body;
    
    if (!devices || !Array.isArray(devices)) {
      return res.status(400).json({ error: 'Lista de dispositivos inválida' });
    }

    const doc = new PDFDocument({ margin: 0, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-dispositivos.pdf"');
    
    doc.pipe(res);

    let pageNum = 1;
    addCBIHeader(doc, 'Inteligência de Frota & Compliance');

    doc.y = 120;
    doc.x = 40;
    
    // Overview metrics
    const total = devices.length;
    const compliant = devices.filter(d => d.compliance).length;
    const critical = devices.filter(d => d.healthScore < 60).length;
    
    doc.fillColor('#0F172A').fontSize(14).font('Helvetica-Bold').text('Resumo Executivo da Frota', 40, doc.y);
    doc.moveDown(0.5);
    doc.fillColor('#64748B').fontSize(10).font('Helvetica').text(`Total de Dispositivos: ${total} | Compliance: ${Math.round((compliant/total)*100)}% | Risco Crítico: ${critical}`);
    doc.moveDown(2);

    devices.forEach((d, i) => {
      if (doc.y > doc.page.height - 120) {
        addCBIFooter(doc, pageNum);
        doc.addPage();
        pageNum++;
        addCBIHeader(doc, 'Inteligência de Frota & Compliance');
        doc.y = 120;
        doc.x = 40;
      }

      const startY = doc.y;
      doc.rect(40, startY, doc.page.width - 80, 85).fill('#FFFFFF').stroke('#E2E8F0');
      
      // Health Score indicator
      const scoreColor = d.healthScore < 50 ? '#EF4444' : d.healthScore < 80 ? '#F59E0B' : '#10B981';
      doc.rect(40, startY, 5, 85).fill(scoreColor);
      
      doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text(`${d.name} (${d.type})`, 60, startY + 15);
      
      doc.fillColor('#64748B').fontSize(9).font('Helvetica');
      doc.text(`Usuário: ${d.user}  |  Departamento: ${d.department}  |  IP: ${d.ip}`, 60, startY + 35);
      
      doc.text(`Saúde: `, 60, startY + 55, { continued: true }).fillColor(scoreColor).text(`${d.healthScore}%  `, { continued: true })
         .fillColor('#64748B').text(`|  CPU: ${d.cpu}%  |  RAM: ${d.ram}%  |  Compliance: `, { continued: true })
         .fillColor(d.compliance ? '#10B981' : '#EF4444').text(d.compliance ? 'OK' : 'FALHA');

      doc.y = startY + 100;
    });

    addCBIFooter(doc, pageNum);
    doc.end();

  } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
    logger.error({ err: error }, 'PDF generation error:');
    res.status(500).json({ error: 'Erro ao gerar PDF de dispositivos' });
  }
});

export default router;
