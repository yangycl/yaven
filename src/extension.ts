// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Filechange ,readYaJson , initAllChanges} from "./function";
import { promises } from 'dns';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log("⚡ yaven activate 開始執行");

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "yaven" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const yaveninit = vscode.commands.registerCommand('yaven.init', async () => {
		try {
			const folders = vscode.workspace.workspaceFolders;
			if (!folders || folders.length === 0) {
				vscode.window.showErrorMessage("錯誤：請先開啟資料夾");
				return;
			}
			const rootUri = folders[0].uri;

			// 用 with() 來調整路徑，確保路徑格式正確
			const yajsonUri = rootUri.with({ path: rootUri.path.endsWith('/') ? rootUri.path + '.ya.json' : rootUri.path + '/.ya.json' });

			// 空的 JSON 內容，格式化縮排2空格
			const yajsonStr = JSON.stringify({}, null, 2);

			await vscode.workspace.fs.writeFile(yajsonUri, Buffer.from(yajsonStr, 'utf8'));

			vscode.window.showInformationMessage('yaven 初始化成功！');
		} catch (error) {
			vscode.window.showErrorMessage(`初始化失敗：${error instanceof Error ? error.message : String(error)}`);
		}
	});

	context.subscriptions.push(yaveninit);
	const yavennewven = vscode.commands.registerCommand("yaven.newven",async ():Promise<void> => {
		let yaJsonObj: Record<string, Record<string, any>> = {};
		try {
			yaJsonObj = await readYaJson();
		} catch (error) {
			vscode.window.showErrorMessage("請先初始化.ya.json");
			return;
		}
		const changes:Record<string,Filechange> = await initAllChanges();
		const newvenmessage:string|undefined = await vscode.window.showInputBox({
			prompt:"請輸入newvenmessage",
			placeHolder:"your message",
			ignoreFocusOut:true
		});
		if(!newvenmessage){
			vscode.window.showWarningMessage("請輸入有效newvenmessage");
			return;
		}
		yaJsonObj[newvenmessage] = changes;
		const newyajsonstr = JSON.stringify(yaJsonObj,null,2);
		console.log(newyajsonstr);
		const folder = vscode.workspace.workspaceFolders?.[0];
		if(!folder){
			vscode.window.showErrorMessage("請先開啟資料夾");
			return;
		}
		const yajsonUri = vscode.Uri.joinPath(folder.uri, '.ya.json');
		await vscode.workspace.fs.writeFile(yajsonUri, Buffer.from(newyajsonstr, 'utf8'));
	});
	context.subscriptions.push(yavennewven);
}

// This method is called when your extension is deactivated
export function deactivate() {}
