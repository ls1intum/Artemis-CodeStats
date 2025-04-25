// Define interface for module statistics
export interface ModuleStats {
    components: number;
    directives: number;
    pipes: number;
    injectables: number;
    total: number;
}

// Define interface for change detection statistics
export interface ChangeDetectionStats {
    onPush: number;
    default: number;
    implicit: number; // No explicit strategy specified (also Default)
    total: number;
}

export interface ReportData {
  metadata: {
      title: string;
      generatedAt: string;
  };
  componentInventory: Record<string, ModuleStats>;
  changeDetection: Record<string, ChangeDetectionStats>;
}