"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  HardDrive,
  RotateCcw,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { businessConfig } from "@/config/business.config";
import { ConfirmDialog, PageHeader, SectionTabs, StatCards, type Stat } from "@/features/admin";
import { useIsClient } from "@/lib/use-local-store";
import { useSystem } from "../hooks/use-system";
import {
  commitAreaCsvImport,
  downloadTextFile,
  exportAreaToCsv,
  getAreaTemplateCsv,
  previewAreaCsvImport,
  type AreaImportPreview,
  type TransferAreaId,
} from "../services/data-transfer";
import {
  exportFullSystemBackup,
  getLocalStorageModulesSummary,
  importFullSystemBackup,
  resetAllDemoData,
} from "../services/system-store";

type DataTransferTab = "excel" | "backup";

export function DataTransferManager() {
  const isHydrated = useIsClient();
  const { auditLog } = useSystem();
  const [tab, setTab] = useState<DataTransferTab>("excel");
  const [selectedArea, setSelectedArea] = useState<TransferAreaId>("stock");
  const [rawCsvText, setRawCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<AreaImportPreview | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const areas = businessConfig.system.transferAreas;
  const currentArea = areas.find((a) => a.id === selectedArea) ?? areas[0];
  const areaSelectItems = areas.map((a) => ({ value: a.id, label: a.label }));
  const localStores = getLocalStorageModulesSummary();
  const totalBytes = localStores.reduce((sum, item) => sum + item.sizeBytes, 0);
  const importableCount = areas.filter((a) => a.supportsImport).length;

  const stats: Stat[] = [
    {
      label: "Áreas disponibles",
      value: String(areas.length),
      hint: `${importableCount} con importación masiva`,
      icon: FileSpreadsheet,
    },
    {
      label: "Área seleccionada",
      value: currentArea.label,
      hint: currentArea.supportsImport ? "Exporta e importa Excel/CSV" : "Solo exportación Excel/CSV",
      icon: Upload,
    },
    {
      label: "Módulos en memoria",
      value: String(localStores.length),
      hint: "Persistencia localStorage activa",
      icon: Database,
    },
    {
      label: "Tamaño backup local",
      value: `${Math.max(1, Math.round(totalBytes / 1024))} KB`,
      hint: "Exportable en 1 clic a .json",
      icon: HardDrive,
    },
  ];

  function handleAreaChange(nextArea: string | null) {
    if (!nextArea) return;
    setSelectedArea(nextArea as TransferAreaId);
    setRawCsvText("");
    setFileName("");
    setPreview(null);
  }

  function handleExportAreaExcel() {
    const res = exportAreaToCsv(selectedArea, auditLog);
    downloadTextFile(res.filename, res.csvContent);
    toast.success(`${currentArea.label}: ${res.recordCount} registros exportados para Excel`);
  }

  function handleDownloadTemplate() {
    const tpl = getAreaTemplateCsv(selectedArea);
    downloadTextFile(tpl.filename, tpl.csvContent);
    toast.success(`Plantilla Excel descargada (${tpl.filename})`);
  }

  function handleCsvFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      const res = previewAreaCsvImport(selectedArea, content);
      if (!res.ok) {
        toast.error(res.error);
        setPreview(null);
        setRawCsvText("");
        setFileName("");
        return;
      }
      setRawCsvText(content);
      setFileName(file.name);
      setPreview(res.preview);
      toast.success(`${res.preview.totalRows} filas listas para importar en ${currentArea.label}`);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleCommitCsvImport() {
    if (!rawCsvText) return;
    const res = await commitAreaCsvImport(selectedArea, rawCsvText);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      `Importación en ${currentArea.label}: ${res.result.created} creados, ${res.result.updated} actualizados, ${res.result.skipped} omitidos`,
    );
    setRawCsvText("");
    setFileName("");
    setPreview(null);
  }

  function handleDownloadBackup() {
    const json = exportFullSystemBackup();
    downloadTextFile(
      `backup-burger-vb-${new Date().toISOString().slice(0, 10)}.json`,
      json,
      "application/json;charset=utf-8",
    );
    toast.success("Copia de seguridad completa descargada (.json)");
  }

  function handleImportBackupFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      const res = importFullSystemBackup(content);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Copia restaurada (${res.keysCount} módulos). Recargando...`);
      setTimeout(() => window.location.reload(), 900);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleConfirmResetDemo() {
    resetAllDemoData();
    setConfirmResetOpen(false);
    toast.success("Datos de demostración restablecidos a su estado original");
    setTimeout(() => window.location.reload(), 700);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar, exportar y copias"
        description="Exportá e importá planillas compatibles con Excel por cada área del local, o descargá y restaurá copias de seguridad JSON."
        actions={
          <Button
            variant="outline"
            className="h-11 rounded-xl px-4 font-semibold"
            onClick={handleDownloadBackup}
          >
            <Download className="size-4" />
            Descargar backup JSON
          </Button>
        }
      />

      <StatCards stats={stats} />

      <SectionTabs<DataTransferTab>
        id="data-transfer-tabs"
        label="Secciones de transferencia de datos"
        value={tab}
        onChange={setTab}
        tabs={[
          {
            value: "excel",
            label: "Importar y exportar (Excel)",
            icon: FileSpreadsheet,
            count: areas.length,
          },
          {
            value: "backup",
            label: "Copias de seguridad y datos demo",
            icon: HardDrive,
          },
        ]}
      />

      <AnimatePresence mode="wait" initial={false}>
        {tab === "excel" && (
          <motion.div
            key="excel"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="space-y-6"
          >
            {/* Selector de área y botones rápidos */}
            <div className="bg-background grid gap-5 rounded-2xl border p-5 lg:grid-cols-12">
              <div className="min-w-0 space-y-4 lg:col-span-5">
                <div className="space-y-2">
                  <Label htmlFor="transfer-area-select">Área del sistema</Label>
                  <Select
                    items={areaSelectItems}
                    value={selectedArea}
                    onValueChange={handleAreaChange}
                  >
                    <SelectTrigger
                      id="transfer-area-select"
                      className="h-11 w-full rounded-xl font-semibold"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">{currentArea.description}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {areas.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => handleAreaChange(area.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        area.id === selectedArea
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-muted/40 hover:bg-muted text-foreground"
                      }`}
                    >
                      {area.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:col-span-7">
                <div className="flex flex-col justify-between space-y-4 rounded-2xl border p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Download className="text-primary size-6" />
                      <Badge variant="secondary" className="rounded-full text-[11px]">
                        Excel / CSV UTF-8
                      </Badge>
                    </div>
                    <p className="font-bold">Exportar {currentArea.label}</p>
                    <p className="text-muted-foreground text-xs">
                      Descarga los registros actuales en formato `.csv` con codificación UTF-8 BOM
                      para abrir directo en Microsoft Excel o Google Sheets.
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="h-10 w-full rounded-xl font-bold"
                    onClick={handleExportAreaExcel}
                  >
                    <Download className="size-4" />
                    Exportar a Excel (.csv)
                  </Button>
                </div>

                <div className="flex flex-col justify-between space-y-4 rounded-2xl border p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Upload className="text-primary size-6" />
                      <Badge
                        variant={currentArea.supportsImport ? "default" : "outline"}
                        className="rounded-full text-[11px]"
                      >
                        {currentArea.supportsImport ? "Importable" : "Solo exportación"}
                      </Badge>
                    </div>
                    <p className="font-bold">Importar en {currentArea.label}</p>
                    <p className="text-muted-foreground text-xs">
                      {currentArea.supportsImport
                        ? "Subí una planilla `.csv` exportada desde Excel (separada por coma o punto y coma) para crear o actualizar registros."
                        : "Por trazabilidad contable y auditoría, esta área solo admite exportación."}
                    </p>
                  </div>

                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCsvFileSelected}
                    className="hidden"
                  />

                  <div className="flex flex-col gap-2 sm:flex-row">
                    {currentArea.supportsImport && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 flex-1 rounded-xl text-xs font-semibold"
                        onClick={handleDownloadTemplate}
                      >
                        Plantilla
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!currentArea.supportsImport}
                      className="h-10 flex-1 rounded-xl font-bold"
                      onClick={() => csvInputRef.current?.click()}
                    >
                      <Upload className="size-4" />
                      Seleccionar CSV
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Vista previa de importación */}
            {preview && (
              <div className="bg-background space-y-4 rounded-2xl border p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-primary size-5 shrink-0" />
                    <div>
                      <p className="font-bold">
                        Vista previa: {fileName} ({preview.totalRows} filas detectadas)
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Mostrando las primeras {preview.rows.length} filas antes de aplicar cambios en{" "}
                        {currentArea.label}.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-xl"
                      onClick={() => {
                        setPreview(null);
                        setRawCsvText("");
                        setFileName("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      className="h-10 rounded-xl font-bold"
                      onClick={handleCommitCsvImport}
                    >
                      Confirmar importación ({preview.totalRows})
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {preview.headers.map((header) => (
                          <TableHead key={header} className="whitespace-nowrap font-mono text-xs">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.rows.map((row, idx) => (
                        <TableRow key={idx}>
                          {preview.headers.map((header) => (
                            <TableCell key={header} className="max-w-52 truncate text-xs">
                              {row[header] || "—"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {tab === "backup" && (
          <motion.div
            key="backup"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="grid gap-6 lg:grid-cols-12"
          >
            <div className="bg-background min-w-0 space-y-5 rounded-2xl border p-5 lg:col-span-7">
              <div>
                <h3 className="text-lg font-bold">
                  Respaldo integral y portabilidad de base local
                </h3>
                <p className="text-muted-foreground text-xs">
                  Descargá una copia completa en JSON con el menú, stock, clientes, sellos, caja,
                  equipo y configuración, o restaurala en otra computadora del local.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-3 rounded-2xl border p-4">
                  <Download className="text-primary size-6" />
                  <div>
                    <p className="font-bold">Exportar copia de seguridad</p>
                    <p className="text-muted-foreground text-xs">
                      Genera un archivo `.json` con todos los módulos actuales de Burger VB.
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="h-10 w-full rounded-xl font-bold"
                    onClick={handleDownloadBackup}
                  >
                    Descargar Backup (.json)
                  </Button>
                </div>

                <div className="space-y-3 rounded-2xl border p-4">
                  <Upload className="text-primary size-6" />
                  <div>
                    <p className="font-bold">Restaurar desde archivo</p>
                    <p className="text-muted-foreground text-xs">
                      Cargá un respaldo `.json` previamente descargado desde Burger VB.
                    </p>
                  </div>
                  <input
                    ref={jsonInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportBackupFile}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 w-full rounded-xl font-bold"
                    onClick={() => jsonInputRef.current?.click()}
                  >
                    Seleccionar archivo JSON
                  </Button>
                </div>
              </div>

              <div className="border-destructive/30 bg-destructive/5 space-y-3 rounded-2xl border p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="text-destructive mt-0.5 size-5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold">
                      Restablecer datos de demostración de Burger VB
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Vuelve a cargar el estado inicial de fábrica de todos los módulos (menú,
                      stock, clientes, club de sellos, caja, equipo y configuración) sin cerrar tu
                      sesión actual.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-10 rounded-xl font-bold"
                  onClick={() => setConfirmResetOpen(true)}
                >
                  <RotateCcw className="size-4" />
                  Restablecer datos de fábrica / demo
                </Button>
              </div>
            </div>

            <div className="bg-background min-w-0 space-y-4 rounded-2xl border p-5 lg:col-span-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold">Estado de almacenes locales</h4>
                  <p className="text-muted-foreground text-xs">
                    Persistencia activa en este navegador (`localStorage`).
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full">
                  {localStores.length} tiendas
                </Badge>
              </div>

              {localStores.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border p-4 text-xs">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <span>Usando semillas por defecto en memoria (sin cambios guardados aún).</span>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Clave del módulo</TableHead>
                        <TableHead className="text-right">Tamaño</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {localStores.map((item) => (
                        <TableRow key={item.key}>
                          <TableCell className="font-mono text-xs">{item.key}</TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {(item.sizeBytes / 1024).toFixed(1)} KB
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title="¿Restablecer todos los datos de demostración?"
        description="Se restaurarán los productos, stock, caja, clientes, equipo y configuración a los valores iniciales de Burger VB."
        confirmLabel="Sí, restablecer todo"
        onConfirm={handleConfirmResetDemo}
      />
    </div>
  );
}
