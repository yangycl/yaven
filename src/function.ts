import * as vscode from 'vscode';

type LineMap = Record<number, string>;
type Diff = "M" | "D" | "U";

export class Filechange {
	constructor(
		public type: Diff,
		public origin?: LineMap,
		public after?: LineMap
	) {}
}

export async function readYaJson(): Promise<Record<string, Record<string, Filechange>>> {
	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder) {
        throw new Error("請先開啟資料夾");
    }
	const yajsonUri = vscode.Uri.joinPath(folder.uri, '.ya.json');

	try {
		const doc = await vscode.workspace.openTextDocument(yajsonUri);
		const content = doc.getText();
		return JSON.parse(content);
	} catch (err) {
		// 如果沒找到 .ya.json，就視為空物件
		return {};
	}
}
var readYaIgnore:Function = async ():Promise<string[] | never> => {
	const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, '.yaignore.txt');
	try {
		const yaignoreunit8:Uint8Array = await vscode.workspace.fs.readFile(uri);
		const yaignoretext:string = new TextDecoder().decode(yaignoreunit8);
		const yaignorearr:string[] = yaignoretext
			.split("\n")
			.map(line => line.trim())     // 去掉前後空白
			.filter(line => line.length > 0);  // 避免空行
		;
		return yaignorearr;
	} catch (e:any) {
		if(e.code === "FileNotFound" || e.code === "ENOENT"){
			console.error(e);
			return [];
		}else{
			console.error(e);
			throw e;
		}
	}
};
import { minimatch } from 'minimatch';//支援萬用字元*
export async function initAllChanges(): Promise<Record<string, Filechange>> {
	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder) {
        throw new Error("請先開啟資料夾");
    }

	const allFiles = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
	const yaJson = await readYaJson();

	// 取得最後一次版本訊息 (取最後一個 key)
	const versions = Object.keys(yaJson);
	const latestVer = versions.length > 0 ? yaJson[versions.at(-1)!] : {};

	const result: Record<string, Filechange> = {};
	const ignorelist:string[] = await readYaIgnore();
	console.log("ignorelist:", ignorelist);
	
	for (const file of allFiles) {
		
		const absPath = file.fsPath;
		const relPath = vscode.workspace.asRelativePath(file); // 存在 .ya.json 裡用相對路徑
		//忽略設定檔
		if (relPath === '.yaignore.txt' || relPath === '.ya.json') {
			continue;
		}


		
		if(ignorelist.some(pattern => minimatch(relPath, pattern))){
			console.log(`🚫 忽略: ${relPath}`);
			continue;
		}
		console.log(`✅ 保留: ${relPath}`);
		try {
			const doc = await vscode.workspace.openTextDocument(file);
			const lines = doc.getText().split('\n');
			const after: LineMap = {};
			let origin = latestVer?.[relPath]?.origin;
			let isModified = false;

			if (origin) {
				for (const key in origin) {
					const line = Number(key);
					if (lines[line] !== origin[line]) {
						after[line] = lines[line];
						isModified = true;
					}
				}
				result[relPath] = new Filechange("M", origin, isModified ? after : undefined);
			} else {
				// origin 不存在 → 視為新增檔案
				result[relPath] = new Filechange("U");
			}
		} catch (e) {
			// 開不了檔案 → 視為刪除
			result[relPath] = new Filechange("D");
		}
	}

	return result;
}
