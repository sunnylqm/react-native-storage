export interface LoadParams {
	key: string;
	id?: string;
	autoSync?: boolean;
	syncInBackground?: boolean;
	syncParams?: any;
}

export default class Storage {
	sync: any;

	constructor(params?: {
		size?: number;
		storageBackend?: any;
		defaultExpires?: number | null;
		enableCache?: boolean;
		sync?: any; 
	});

	save(params: { key: string; id?: string; data: any; expires?: number | null }): Promise<void>;

	load<T = any>(params: LoadParams): Promise<T>;

	getIdsForKey(key: string): Promise<string[]>;

	getAllDataForKey<T = any>(key: string): Promise<T[]>;

	getBatchData<T = any>(params: LoadParams[]): Promise<T[]>;

	getBatchDataWithIds<T = any>(params: { key: string; ids: string[] }): Promise<T[]>;

	clearMapForKey(key: string): Promise<void>;

	remove(params: { key: string; id?: string }): Promise<void>;

	clearMap(): Promise<void>;
}
