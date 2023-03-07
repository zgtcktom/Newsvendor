let playButton = document.getElementById('play-button');
let pauseButton = document.getElementById('pause-button');
let toggleState = 1;

playButton.onclick = pauseButton.onclick = () => togglePlayPause();

let animateStates = [];
let resumePlayState = () => {};

function clearFinished(force = false) {
	let stillRunning = [];
	for (let animateState of animateStates) {
		if (force) animateState.handler.finish();
		if (!animateState.handler.isFinished) {
			stillRunning.push(animateState);
		}
	}
	animateStates = stillRunning;
}

function setPlayPause(state) {
	if ((toggleState = state)) {
		playButton.style.display = '';
		pauseButton.style.display = 'none';
		resumePlayState();
		clearFinished();
		for (let animateState of animateStates) {
			animateState.handler.play();
		}
	} else {
		playButton.style.display = 'none';
		pauseButton.style.display = '';
		for (let animateState of animateStates) {
			animateState.handler.pause();
		}
	}
}

function togglePlayPause() {
	setPlayPause(!toggleState);
}

function getPlayPauseState() {
	return toggleState;
}
setPlayPause(toggleState);

let savedProgress = 0;
function setProgress(fraction) {
	let progressBar = document.getElementById('progress-bar');
	let progress = Math.round(fraction * 100);
	progressBar.style.background = `conic-gradient(rgb(3, 133, 255) ${progress}%, rgb(242, 242, 242) ${progress}%)`;
}

function updateTable(rows) {
	let table = document.getElementById('choices');
	table.innerHTML = '';
	let fragment = document.createDocumentFragment();
	for (let row of rows) {
		let tr = document.createElement('tr');
		let i = 0;
		for (let col of row) {
			let td = document.createElement('td');
			td.innerHTML = (i > 1 ? col?.toFixed?.(4) ?? col : col) ?? '&nbsp;';
			tr.append(td);
			i++;
		}
		fragment.append(tr);
	}
	table.append(fragment);
}

let popupFirst;
function popup(form, hiddenFields, displayNames) {
	let data = {};
	let fragment = document.createDocumentFragment();
	for (let field of Object.keys(form)) {
		let fieldElement = document.createElement('div');
		fieldElement.classList.add('form-field');
		let label = document.createElement('label');
		let input = document.createElement('input');
		label.innerHTML = displayNames?.[field] ?? field;
		input.setAttribute('type', typeof form[field] == 'number' ? 'number' : 'text');
		input.value = form[field];
		fieldElement.append(label, input);

		if (!hiddenFields.includes(field)) {
			fragment.append(fieldElement);
			popupFirst = popupFirst ?? input;
		}
		data[field] = () => input.value;
	}
	let formField = document.getElementById('popup-form');
	formField.innerHTML = '';
	formField.appendChild(fragment);

	return data;
}

window.popup = popup;

function hide() {
	let popup = document.getElementById('popup');
	popup.parentElement.style.display = 'none';
	popupBackground.style.display = 'none';
	hide2();
}

let pause;

function show() {
	let popup = document.getElementById('popup');
	popup.parentElement.style.display = 'block';
	popupBg(hide);

	pause?.();
	popupFirst?.focus();
}

let popupBackground = document.getElementById('popup-background');
function popupBg(hide) {
	popupBackground.style.display = 'block';

	popupBackground.onclick = () => {
		popupBackground.style.display = 'none';
		hide?.();
	};
}

let popup2First;
function popup2(form, displayNames, callbacks) {
	let data = {};
	let fragment = document.createDocumentFragment();
	let first;
	for (let field of Object.keys(form)) {
		let fieldElement = document.createElement('div');
		fieldElement.classList.add('form-field');
		let label = document.createElement('label');
		let input = document.createElement('input');
		label.innerHTML = displayNames?.[field] ?? field;
		input.setAttribute('type', typeof form[field] == 'number' ? 'number' : 'text');
		input.value = form[field];
		fieldElement.append(label, input);
		fragment.append(fieldElement);
		data[field] = () => input.value;

		callbacks?.[field]?.(label, input);

		if (!input.disabled) {
			popup2First = popup2First ?? input;
		}
	}
	let formField = document.getElementById('popup-form2');
	formField.innerHTML = '';
	formField.appendChild(fragment);

	// first?.focus();
	// console.log('first', first)
	return data;
}
window.popup2 = popup2;

function hide2() {
	let popup = document.getElementById('popup2');
	popup.parentElement.style.display = 'none';
	popupBackground.style.display = 'none';
}

function show2() {
	let popup = document.getElementById('popup2');
	popup.parentElement.style.display = 'block';
	popupBg(hide2);

	popup2First?.focus();
	popup2First?.select();
}

function hideAll() {
	hide();
	hide2();
}

function run_simulation(params, theta = 0) {
	let problem = new Newsvendor(params);
	let iter = problem.runIter(theta);
	return [
		problem,
		{
			next: () => {
				let { value, done } = iter.next();
				return {
					value,
					done,
				};
			},
		},
	];
}

let setPrevDemand;

let manualInput = popup2(
	{
		prevDemand: 0,
		amount: 0,
	},
	{
		prevDemand: 'Current inventory level',
		amount: 'Order quantity',
	},
	{
		prevDemand(label, input) {
			input.disabled = true;
			setPrevDemand = value => {
				input.value = value;
			};
		},
	}
);

let data = popup(
	{
		alpha: 0.2,
		lower: 20,
		upper: 40,
		bias: -4,
		std: 2,
		overageCost: 2,
		underageCost: 8,
		iterations: 60,
		testTrial: 10,
		thetaList: '0, 1, 2, 3, 4, 5',
		intervalRange: '0, 10',
		intervalStep: 1,
		sellingPrice: 0,
		orderCost: 0,
		goal: 10000,
		time: 1,
		theta: 0,
		seed: '123456789',
	},
	[
		'alpha',
		'bias',
		'std',
		'testTrial',
		'thetaList',
		'intervalRange',
		'intervalStep',
		'sellingPrice',
		'orderCost',
		'goal',
	],
	{
		seed: 'Random seed',
		lower: 'Lower limit of demand',
		upper: 'Upper limit of demand',
		overageCost: 'Overstock cost',
		underageCost: 'Understock cost',
		iterations: 'Number of days',
		theta: 'Exploration rate',
		time: 'Waiting time (s)',
	}
);

let prevChart = null;
let prevHandler = null;

function isManual() {
	return document.getElementById('use-policy')['use-policy'].value == 'manual';
}
function isPreTrained() {
	return document.getElementById('use-policy')['use-policy'].value == 'pre-trained';
}
console.log('isManual', isManual());

window.debug = true;

let playgroundMsg = document.getElementById('playground-msg');

let IEValueColumn = document.getElementById('IEValueColumn');
for (let input of document.getElementById('use-policy')['use-policy']) {
	input.addEventListener('input', () => {
		if (isManual()) {
			IEValueColumn.style.display = 'none';
		} else {
			IEValueColumn.style.display = '';
		}
	});
}

function openSettings() {
	function submitSettings(data) {
		hide();
		if (prevHandler) {
			clearInterval(prevHandler);
			prevHandler = null;
		}
		let results = {};
		for (let key of Object.keys(data)) {
			let value = data[key]();
			if (['thetaList', 'intervalRange'].includes(key)) {
				value = value.split(',').map(elem => +elem.trim());
			} else {
				value = +value;
			}
			results[key] = value;
		}

		// playgroundMsg.innerHTML = `Minimum demand: ${results.lower}, Maximum demand: ${results.upper}`;

		window.setSeed(results.seed);
		results.time *= 1000;
		console.log(results);
		let { intervalRange, intervalStep } = results;

		let manualMapping = [],
			learningMapping = [],
			preTrainedMapping = [];

		let mapping = preTrainedMapping;

		let oninput = () => {
			if (isManual()) {
				if (mapping != manualMapping) {
					setPlayPause(0);
					next.onclick?.();
				}
				mapping = manualMapping;
				debug && console.log('switch manual mapping');
			} else if (isPreTrained()) {
				mapping = preTrainedMapping;
				debug && console.log('switch pretrained mapping');
			} else {
				mapping = learningMapping;
				debug && console.log('switch learning mapping');
			}
			updateTable(mapping);
			resumePlayState?.();
		};

		for (let input of document.getElementById('use-policy')['use-policy']) {
			input.oninput = oninput;
		}

		let [problem, controller] = run_simulation(results, results.theta);

		for (let value = intervalRange[0]; value <= intervalRange[1]; value += intervalStep) {
			learningMapping[value | 0] = ['&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;'];
			preTrainedMapping[value | 0] = ['&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;'];
		}

		updateTable(mapping);

		let remainingDay = document.getElementById('remaining-day');
		let totalCosts = document.getElementById('total-costs');
		let understockCosts = document.getElementById('understock-costs');
		let overstockCosts = document.getElementById('overstock-costs');
		let totalUnits = document.getElementById('total-units');
		let totalRevenue = document.getElementById('total-revenue');
		let totalProfit = document.getElementById('total-profit');
		let goal = document.getElementById('goal');
		let totalProfitProgress = document.getElementById('total-profit-progress');

		goal.innerHTML = results.goal;
		let next = document.getElementById('next');
		let accum_units = 0;
		let days = results.iterations;
		remainingDay.innerHTML = days;
		let { sellingPrice, orderCost } = results;

		totalUnits.innerHTML = `0`;
		totalRevenue.innerHTML = `$0`;
		understockCosts.innerHTML = `$0`;
		overstockCosts.innerHTML = `$0`;
		totalCosts.innerHTML = `$0 + $0 = $0`;
		totalProfit.innerHTML = `$0 - $0 = $0`;
		totalProfitProgress.style.width = `0%`;

		let choiceHist = [];
		let prevChoice = null;

		let demand_history = [];
		let order_history = [];

		let chartElement = document.getElementById('chart');
		let [chart, updateChart, destroyChart] = (function () {
			let getLabels = () => {
				return new Array(order_history.length).fill(0).map((elem, index) => index + 1);
			};
			let data = {
				labels: getLabels(),
				datasets: [
					{
						label: 'Order',
						data: order_history,
						borderColor: 'rgb(54, 162, 235)',
						backgroundColor: 'rgb(54, 162, 235)',
					},
					{
						label: 'Demand',
						data: demand_history,
						borderColor: 'rgb(255, 99, 132)',
						backgroundColor: 'rgb(255, 99, 132)',
					},
				],
			};

			// const config = {
			// 	type: 'line',
			// 	data: data,
			// 	options: {
			// 		maintainAspectRatio: false,
			// 		responsive: true,
			// 		interaction: {
			// 			mode: 'index',
			// 			intersect: false,
			// 		},
			// 		stacked: false,
			// 		plugins: {
			// 			title: {
			// 				display: true,
			// 				text: 'Inventory levels',
			// 			},
			// 		},
			// 	},
			// };

			// if (prevChart != null) {
			// 	prevChart.destroy();
			// }

			// let chart = new Chart(chartElement, config);
			// prevChart = chart;

			let chart = {};

			let update = () => {
				// console.log(getLabels());
				// chart.data.labels = getLabels();
				// chart.data.datasets[0].data = order_history;
				// chart.data.datasets[1].data = demand_history;
				// chart.update();
			};

			let destroy = () => {
				chart.destroy();
			};
			return [chart, update, destroy];
		})();

		let progressBarCancel = null;
		let playProgressBar = (duration, watch = false) => {
			return new Promise((resolve, reject) => {
				let previousTimestamp = -1;
				let progress = 0;
				let step = timestamp => {
					let done = false;
					progress += previousTimestamp == -1 ? 0 : (timestamp - previousTimestamp) / duration;
					previousTimestamp = timestamp;
					if (progress >= 1) {
						progress = 1;
						done = true;
						savedProgress = 0;
					} else {
						savedProgress = progress;
					}
					//   console.log(progress);
					setProgress(progress);
					if (!done) {
						frameId = requestAnimationFrame(step);
					} else {
						resolve();
						frameId = -1;
					}
				};
				let frameId = requestAnimationFrame(step);
				let cancel = () => {
					console.log('cancel');
					if (frameId != -1) {
						cancelAnimationFrame(frameId);
					}
				};
				if (watch) {
					progressBarCancel = cancel;
				}
			});
		};

		let allDone = false;
		let accum_reward_at_timestep;
		let animateState = null;
		next.style.display = '';
		let prevValue = undefined,
			prevDone = false;

		let manualRow = null;

		next.onclick = () => {
			// console.log(value, done);
			if (prevDone) {
				allDone = true;
				next.onclick = () => {};
				next.style.display = 'none';
				clearInterval(handler);
				console.log(choiceHist);
			} else {
				// console.log(isManual());
				if (isManual()) {
					let confirm2 = document.getElementById('confirm2');

					document.onkeydown = e => {
						if (e.key == 'Enter') {
							e.preventDefault();
							confirm2.onclick();
							document.onkeydown = null;
						} else if (e.key == 'Escape') {
							e.preventDefault();
							hideAll();
						}
					};

					confirm2.onclick = () => {
						console.log(manualInput, manualInput.amount());
						problem.manualPolicy = { order: manualInput.amount() };
						hide2();

						let { value, done } = controller.next();
						prevValue = value;
						prevDone = done;

						if (done) return;

						let record = value;
						let order = problem.manualPolicy.order;
						let demand = record.nextState.demand;

						setPrevDemand?.(demand);

						demand_history.push(demand);
						order_history.push(order);

						updateChart();

						// console.log(demand_history, order_history);

						if (prevChoice) {
							prevChoice.style.outline = '';
						}

						console.log(problem.manualPolicy, record);

						days--;
						remainingDay.innerHTML = days;
						accum_units += Math.min(order, demand);
						let revenue = (accum_units * sellingPrice).toFixed(1);
						// let costs = (accum_units * orderCost).toFixed(1);
						if (record.timestep == 100) {
							accum_reward_at_timestep = record.accum_reward;
						}
						// let costs = (-record.accum_reward + accum_units * orderCost).toFixed(1);
						// let costs = -(record.accum_reward - accum_reward_at_timestep).toFixed(1);
						let costs = -record.accum_reward.toFixed(1);
						let profit = revenue - costs;
						let progress = Math.min(1, profit / results.goal) * 100;
						let understock = record.accum_understock_reward.toFixed(1);
						let overstock = record.accum_overstock_reward.toFixed(1);

						totalUnits.innerHTML = `${accum_units}`;
						totalRevenue.innerHTML = `$${revenue}`;
						understockCosts.innerHTML = `$${understock}`;
						overstockCosts.innerHTML = `$${overstock}`;
						totalCosts.innerHTML = `$${understock} + $${overstock} = $${costs.toFixed(1)}`;
						// totalProfit.innerHTML = `$${revenue} - $${costs} = $${profit}`;

						understockCosts.parentElement.style.color = overstockCosts.parentElement.style.color =
							'';
						if (record.overstock) {
							overstockCosts.parentElement.style.color = 'red';
							overstockCosts.innerHTML += ` (+${record.overstock.toFixed(1)})`;
						} else if (record.understock) {
							understockCosts.parentElement.style.color = 'red';
							understockCosts.innerHTML += ` (+${record.understock.toFixed(1)})`;
						}

						totalProfitProgress.style.width = `${progress}%`;

						// if (manualRow) manualRow.style.outline = '';
						let row = manualMapping.find(row => row[0] == manualInput.amount());
						if (row == undefined) {
							let row = [manualInput.amount(), record.reward, record.reward];
							row.n = 1;
							manualMapping.push(row);
							// manualRow = row;
						} else {
							row.n++;
							row[1] = record.reward;
							row[2] = (row[2] * (row.n - 1) + record.reward) / row.n;
							// manualRow = row;
						}
						// manualRow.style.outline = '1px solid red';

						mapping.sort((a, b) => b[2] - a[2]);
						updateTable(mapping);

						// animateState?.handler?.pause();
						animateState = animatePath(truckPath, results.time - 20);
						animateStates.push(animateState);

						if (getPlayPauseState()) {
							resumePlayState();
						}
					};
					progressBarCancel?.();
					show2();
					clearInterval(handler);
					return;
				}

				problem.preTrained = isPreTrained();
				problem.manualPolicy = null;

				let { value, done } = controller.next();

				if (prevValue == undefined) {
					// preTrainedAgent
					// for (let value = intervalRange[0]; value <= intervalRange[1]; value += intervalStep) {
					// 	let choice = problem.preTrainedAgent.choices.find(choice => choice.quantity = value | 0);
					// 	if (choice) {
					// 		let { reward, averageReward } = choice;
					// 		let IEValue = choice.getIEValue();
					// 		preTrainedMapping[value | 0] = ['&nbsp;', reward, averageReward, IEValue];
					// 	} else {
					// 		preTrainedMapping[value | 0] = ['&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;'];
					// 	}
					// }
				}

				// prevValue = value;
				// prevDone = done;

				// if (done) return;

				// let record = value;
				// let choice = record.choice;
				// let quantity = choice.quantity;
				// let order = record.decision.order;
				// let demand = record.nextState.demand;

				// setPrevDemand?.(demand);

				// let offset = order - quantity;
				// if (isPreTrained()) {
				//   preTrainedMapping.forEach((elem, index) => {
				//     let choice = problem.preTrainedAgent.choices[index];
				//     elem[0] = index + offset;
				//     elem[1] = choice.reward;
				//     elem[2] = choice.averageReward;
				//     elem[3] = choice.getIEValue();
				//   });
				// } else {
				//   // mapping.forEach((elem, index) => {
				//   // 	elem[0] = index + offset;
				//   // });

				//   // mapping[quantity | 0] = [
				//   // 	order,
				//   // 	record.reward,
				//   // 	record.choice.averageReward,
				//   // 	choice.getIEValue(),
				//   // ];

				//   learningMapping.forEach((elem, index) => {
				//     let choice = problem.learningAgent.choices[index];
				//     elem[0] = index + offset;
				//     elem[1] = choice.reward;
				//     elem[2] = choice.averageReward;
				//     elem[3] = choice.getIEValue();
				//   });
				// }

				// console.log(record);
				// updateTable(mapping);

				// choiceHist[quantity] = (choiceHist[quantity] || 0) + 1;

				// demand_history.push(demand);
				// order_history.push(order);

				// updateChart();

				// // console.log(demand_history, order_history);

				// if (prevChoice) {
				//   prevChoice.style.outline = "";
				// }
				// let table = document.getElementById("choices");
				// prevChoice = table.children[quantity];
				// prevChoice.style.outline = "1px solid red";

				days--;
				remainingDay.innerHTML = days;
				// accum_units += Math.min(order, demand);
				// let revenue = (accum_units * sellingPrice).toFixed(1);
				// // let costs = (accum_units * orderCost).toFixed(1);
				// if (record.timestep == 100) {
				//   accum_reward_at_timestep = record.accum_reward;
				// }
				// // let costs = (-record.accum_reward + accum_units * orderCost).toFixed(1);
				// // let costs = -(record.accum_reward - accum_reward_at_timestep).toFixed(1);
				// // let costs = -record.accum_reward.toFixed(1);
				// let costs = -record.accum_reward.toFixed(1);
				// let profit = revenue - costs;
				// let progress = Math.min(1, profit / results.goal) * 100;

				// let understock = record.accum_understock_reward.toFixed(1);
				// let overstock = record.accum_overstock_reward.toFixed(1);

				// totalUnits.innerHTML = `${accum_units}`;
				// totalRevenue.innerHTML = `$${revenue}`;
				// understockCosts.innerHTML = `$${understock}`;
				// overstockCosts.innerHTML = `$${overstock}`;
				// totalCosts.innerHTML = `$${understock} + $${overstock} = $${costs.toFixed(
				//   1
				// )}`;
				// // totalProfit.innerHTML = `$${revenue} - $${costs} = $${profit}`;

				// understockCosts.parentElement.style.color =
				//   overstockCosts.parentElement.style.color = "";
				// if (record.overstock) {
				//   overstockCosts.parentElement.style.color = "red";
				//   overstockCosts.innerHTML += ` (+${record.overstock.toFixed(1)})`;
				// } else if (record.understock) {
				//   understockCosts.parentElement.style.color = "red";
				//   understockCosts.innerHTML += ` (+${record.understock.toFixed(1)})`;
				// }

				// totalProfitProgress.style.width = `${progress}%`;

				Q.next();
				// animateState?.handler?.pause();
				animateState = animatePath(truckPath, results.time - 20);
				animateStates.push(animateState);

				if (getPlayPauseState()) {
					resumePlayState();
				}
			}
		};

		let handler;

		let resumePlayState = () => {
			if (prevHandler) {
				clearInterval(prevHandler);
				prevHandler = null;
			}

			if (allDone) {
				setProgress(1);
			} else {
				playProgressBar(results.time);
			}

			handler = prevHandler = setInterval(() => {
				if (getPlayPauseState()) {
					next.onclick();
					if (allDone) {
						setProgress(1);
					} else {
						playProgressBar(results.time, true).then(() => {
							// console.log('next');
						});
					}
				}
			}, results.time);
		};

		resumePlayState();
		oninput();

		return [data, resumePlayState, () => clearInterval(handler)];
	}
	let confirm = document.getElementById('confirm');
	document.onkeydown = e => {
		if (e.key == 'Enter') {
			e.preventDefault();
			confirm.onclick();
			document.onkeydown = null;
		} else if (e.key == 'Escape') {
			e.preventDefault();
			hideAll();
			resumePlayState?.();
		}
	};
	confirm.onclick = () => {
		[data, resumePlayState, pause] = submitSettings(data);
	};
	show();
}
let playground = document.getElementById('playground'),
	warehouse = document.getElementById('warehouse'),
	vendor = document.getElementById('vendor'),
	truckNorth = document.getElementById('truck-north'),
	truckEast = document.getElementById('truck-east'),
	truckSouth = document.getElementById('truck-south'),
	truckWest = document.getElementById('truck-west');

let warehouseDirection = [1, 0],
	vendorDirection = [0, 1];

const TILE_WIDTH_HALF = 25,
	TILE_HEIGHT_HALF = TILE_WIDTH_HALF / 2;

function screenToTile(x, y) {
	let tileX = (x / TILE_WIDTH_HALF + y / TILE_HEIGHT_HALF) / 2,
		tileY = (y / TILE_HEIGHT_HALF - x / TILE_WIDTH_HALF) / 2;
	return [tileX, tileY];
}

function toValue(a) {
	if (typeof a == 'undefined' || a == null) return 0;

	a = a.valueOf();
	if (typeof a == 'boolean') a = a ? 1 : 0;
	else if (typeof a == 'object') a = 1;
	else if (typeof a == 'function') a = 1;
	else if (typeof a == 'xml') a = 1;
	return a;
}

function compare(a, b) {
	a = toValue(a);
	b = toValue(b);
	if (typeof a == 'string' && typeof b == 'number') return 0;
	if (typeof a == 'number' && typeof b == 'string') return 1;
	return a < b;
}

function compareArray(a, b) {
	if (!Array.isArray(a) || !Array.isArray(b)) return compare(a, b);
	let len = Math.min(a.length, b.length);
	for (let i = 0; i < len; i++) {
		if (compareArray(a[i], b[i])) return true;
		if (compareArray(b[i], a[i])) return false;
		if (i + 1 == len) return a.length < b.length;
	}
	return false;
}

function mergesort(arr, cmp = compareArray, start = 0, end = arr.length) {
	if (start + 1 == end) return arr;
	let len = end - start,
		half = (len / 2) | 0;
	let left = mergesort(arr.slice(start, half)),
		right = mergesort(arr.slice(half, end));
	for (let i = 0, j = 0, k = 0; k < len; k++) {
		if (i < left.length && (j >= right.length || cmp(left[i], right[j]))) {
			arr[k] = left[i];
			i++;
		} else {
			arr[k] = right[j];
			j++;
		}
	}
	return arr;
}

function equals(a, b) {
	if (a === b) return true;
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length != b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (!equals(a[i], b[i])) return false;
		}
		return true;
	}
	return false;
}

function binarySearchInsertion(arr, element, cmp = compareArray) {
	let left = 0,
		right = arr.length;
	while (true) {
		let middle = ((left + right) / 2) | 0;
		if (cmp(element, arr[middle])) {
			right = middle;
			if (left >= right) {
				arr.splice(right, 0, element);
				return right;
			}
		} else if (cmp(arr[middle], element)) {
			left = middle + 1;
			if (left >= right) {
				arr.splice(left, 0, element);
				return left;
			}
		} else {
			arr.splice(middle, 0, element);
			return middle;
		}
	}
}

function leftRightIndexOf(arr, element, middle, cmp = compareArray, eq = equals) {
	for (let i = middle; i >= 0; i--) {
		if (eq(arr[i], element)) return i;
		if (cmp(arr[i], element)) break;
	}
	for (let i = middle + 1; i < arr.length; i++) {
		if (eq(arr[i], element)) return i;
		if (cmp(element, arr[i])) break;
	}
	return -1;
}

function binarySearchIndexOf(arr, element, cmp = compareArray, eq = equals) {
	let left = 0,
		right = arr.length;
	while (left < right) {
		let middle = ((left + right) / 2) | 0;
		if (cmp(element, arr[middle])) {
			right = middle;
		} else if (cmp(arr[middle], element)) {
			left = middle + 1;
		} else {
			return leftRightIndexOf(arr, element, middle, cmp, eq);
		}
	}
	return -1;
}

class TupleMap {
	#keys;
	#values;
	#defaultValue;

	constructor(defaultValue = undefined) {
		this.#keys = [];
		this.#values = [];
		this.#defaultValue = defaultValue;
	}

	indexOf(key) {
		return binarySearchIndexOf(this.#keys, key);
	}

	get size() {
		return this.#keys.length;
	}

	*[Symbol.iterator]() {
		for (let i = 0; i < this.#keys.length; i++) {
			yield [this.#keys[i], this.#values[i]];
		}
	}

	clear() {
		this.#keys.length = 0;
		this.#values.length = 0;
	}

	delete(key) {
		let index = this.indexOf(key);
		if (index == -1) return false;
		this.#keys.splice(index, 1);
		this.#values.splice(index, 1);
		return true;
	}

	entries() {
		return this[Symbol.iterator]();
	}

	forEach(callback, thisArg = this) {
		for (let [key, value] of this.entries()) {
			callback.call(thisArg, value, key, this);
		}
	}

	get(key) {
		let index = this.indexOf(key);
		if (index == -1) return this.#defaultValue;
		return this.#values[index];
	}

	has(key) {
		return this.indexOf(key) != -1;
	}

	keys() {
		return this.#keys[Symbol.iterator]();
	}

	set(key, value) {
		let index = this.indexOf(key);
		if (index == -1) {
			let index = binarySearchInsertion(this.#keys, key);
			this.#values.splice(index, 0, value);
		} else {
			this.#values[index] = value;
		}
		return this;
	}

	values() {
		return this.#values[Symbol.iterator]();
	}
}

class GridSystem {
	#TILE_WIDTH_HALF = 0;
	#TILE_HEIGHT_HALF = 0;
	#maps;
	#observer;

	constructor(onBeforeUpdate) {
		this.#maps = new TupleMap();
		this.#observer = new ResizeObserver(() => {
			if (onBeforeUpdate) onBeforeUpdate(this);
			this.update(playground);
		});
	}

	setGridSize(width, height = width / 2) {
		this.#TILE_WIDTH_HALF = width / 2;
		this.#TILE_HEIGHT_HALF = height / 2;
		return this;
	}

	setEntity(coords, entity) {
		this.#maps.set(coords, entity);
	}

	getEntity(coords) {
		return this.#maps.get(coords);
	}

	getPosition(coords) {
		let [gridX, gridY] = coords;
		let x = (gridX - gridY) * this.#TILE_WIDTH_HALF;
		let y = (gridX + gridY) * this.#TILE_HEIGHT_HALF;
		return [x, y];
	}

	getGridPosition(coords) {
		let [x, y] = coords;
		let tileX = (x / this.#TILE_WIDTH_HALF + y / this.#TILE_HEIGHT_HALF) / 2,
			tileY = (y / this.#TILE_HEIGHT_HALF + x / this.#TILE_WIDTH_HALF) / 2;
		return [tileX, tileY];
	}

	getGridBound(width, height, center = [width / 2, height / 2]) {
		let [centerX, centerY] = center;
		let top = -centerY,
			bottom = centerY,
			left = -centerX,
			right = centerX;
		let [gridLeft, gridTop] = this.getGridPosition([left, top]);
		let [gridRight, gridBottom] = this.getGridPosition([right, bottom]);

		let bound = n => Math.sign(n) * Math.ceil(Math.abs(n));

		gridLeft = bound(gridLeft);
		gridTop = bound(gridTop);
		gridRight = bound(gridRight);
		gridBottom = bound(gridBottom);

		return [gridLeft, gridRight, gridTop, gridBottom];
	}

	update(playground, autoUpdate = false) {
		if (autoUpdate) {
			this.#observer.observe(playground);
		}
		let [gridLeft, gridRight, gridTop, gridBottom] = this.getGridBound(
			playground.offsetWidth,
			playground.offsetHeight
		);

		let [centerX, centerY] = [playground.offsetWidth / 2, playground.offsetHeight / 2];

		let add = ([x1, y1], [x2, y2]) => [x1 + x2, y1 + y2];

		for (let x = gridLeft; x <= gridRight; x++) {
			for (let y = gridTop; y <= gridBottom; y++) {
				let position = add(this.getPosition([x, y]), [centerX, centerY]);
				let entity = this.getEntity([x, y]);
				if (entity) {
					// console.log(entity);
					let [positionX, positionY] = position;
					positionX -= entity.offsetWidth / 2;
					positionY -= entity.offsetHeight / 2;
					entity.style.left = Math.round(positionX) + 'px';
					entity.style.top = Math.round(positionY) + 'px';
					// console.log('grid coords:', [x, y], position, [entity.style.left, entity.style.top]);
				}
			}
		}

		// console.log('[centerX, centerY]', [centerX, centerY]);
	}

	getMap(border = 1) {
		let [minX, minY] = [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
			[maxX, maxY] = [Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];

		for (let [key, value] of this.#maps) {
			let [x, y] = key;
			[minX, minY] = [Math.min(minX, x), Math.min(minY, y)];
			[maxX, maxY] = [Math.max(maxX, x), Math.max(maxY, y)];
		}

		minX -= border;
		minY -= border;
		maxX += border;
		maxY += border;

		let map = [];
		for (let x = minX; x <= maxX; x++) {
			let row = [];
			for (let y = minY; y <= maxY; y++) {
				let position = [x, y],
					entity = this.getEntity(position);

				row.push([position, entity]);
			}
			map.push(row);
		}

		return map;
	}

	shortestPath(from, to) {
		let map = this.getMap();
		let M = map.length,
			N = map[0].length;

		let topLeft = map[0][0][0];
		from = sub(from, topLeft);
		to = sub(to, topLeft);

		// console.log(from, to);

		let bfs = (from, to, map, M, N) => {
			let stack = [];
			let visited = [];
			let prev = [];

			stack.push(from);
			while (stack.length > 0) {
				let node = stack.shift();
				let [x, y] = node;

				if (x == to[0] && y == to[1]) {
					break;
				}

				if (x > 0 && !visited[(x - 1) * N + y] && !map[x - 1][y][1]) {
					stack.push([x - 1, y]);
					visited[(x - 1) * N + y] = true;
					prev[(x - 1) * N + y] = node;
				}
				if (x < M - 1 && !visited[(x + 1) * N + y] && !map[x + 1][y][1]) {
					stack.push([x + 1, y]);
					visited[(x + 1) * N + y] = true;
					prev[(x + 1) * N + y] = node;
				}
				if (y > 0 && !visited[x * N + (y - 1)] && !map[x][y - 1][1]) {
					stack.push([x, y - 1]);
					visited[x * N + (y - 1)] = true;
					prev[x * N + (y - 1)] = node;
				}
				if (y < N - 1 && !visited[x * N + (y + 1)] && !map[x][y + 1][1]) {
					stack.push([x, y + 1]);
					visited[x * N + (y + 1)] = true;
					prev[x * N + (y + 1)] = node;
				}
			}

			let node = to;
			let path = [node];

			while (true) {
				// console.log(prev, node);
				let [x, y] = node;
				if (x == from[0] && y == from[1]) break;
				node = prev[x * N + y];
				path.push(node);
			}

			return path.reverse();
		};

		return bfs(from, to, map, M, N).map(([i, j]) => map[i][j]);
	}
}

let sub = ([x1, y1], [x2, y2]) => [x1 - x2, y1 - y2];
let mul = ([x1, y1], [x2, y2]) => [x1 * x2, y1 * y2];

console.log(mergesort([1, 'asd', null, {}, function () {}, 99, 'ok', -1, true]));
console.log(true);
let arr = mergesort([[1, 9, 8], [1, 5, 2], [2], [1, 5], [1, 5, -2]]);
console.log(arr);
arr = arr.slice();
binarySearchInsertion(arr, [1, 5, -10]);
binarySearchInsertion(arr, [1, 5, -1]);
binarySearchInsertion(arr, [1, 5, 9]);
binarySearchInsertion(arr, [1, 5, 3]);
console.log(arr);

let sparseArray = new TupleMap(0);
sparseArray.set([0, 0], 'wtf');
sparseArray.set([0, 1], true);
sparseArray.set([0, 2], true);
sparseArray.set([0, 2], -99);
for (let [key, value] of sparseArray) {
	console.log(key, value);
}
console.log(sparseArray.get([0, 99]));

let gridSystem = new GridSystem(function (self) {
	self.setGridSize(warehouse.offsetWidth);
});

let warehousePosition = [0, 2];
let vendorPosition = [0, -2];
gridSystem.setGridSize(warehouse.offsetWidth);
gridSystem.setEntity(warehousePosition, warehouse);
gridSystem.setEntity(vendorPosition, vendor);

console.log('GridSystem', gridSystem.getPosition([-2, -1]));
gridSystem.update(playground, true);
console.log(gridSystem);

console.log(gridSystem.getMap());
let add = ([x1, y1], [x2, y2]) => [x1 + x2, y1 + y2];

let startPosition = add(warehousePosition, warehouseDirection),
	endPosition = add(vendorPosition, vendorDirection);

console.log('shortestPath', gridSystem.shortestPath(startPosition, endPosition));

let animate = (start = {}, end = {}, duration = 1000, onProgress, playNow = true) => {
	let progress = 0;
	let prevTimestamp = -1;
	let frameId = -1;
	let render = progress => {
		let props = {};
		for (let key of Object.keys(start)) {
			props[key] = start[key] + (end[key] - start[key]) * progress;
		}
		onProgress?.(props);
	};
	let step = timestamp => {
		if (prevTimestamp != -1) progress = Math.min(1, progress + (timestamp - prevTimestamp) / duration);
		prevTimestamp = timestamp;
		if (progress == 1) {
			handler.finish();
		} else {
			render(progress);
			frameId = requestAnimationFrame(step);
		}
	};

	let onFinish, onStop;

	let isFinished = false;

	const handler = {
		get isFinished() {
			return isFinished;
		},
		setProgress(n) {
			progress = n;
			return this;
		},
		getProgress() {
			return progress;
		},
		finish() {
			progress = 1;
			this.pause();
			render(progress);
			onFinish?.(handler);
			isFinished = true;
			return this;
		},
		play() {
			if (frameId == -1) frameId = requestAnimationFrame(step);
			return this;
		},
		pause() {
			if (frameId != -1) cancelAnimationFrame(frameId);
			prevTimestamp = -1;
			frameId = -1;
			return this;
		},
		stop() {
			progress = 0;
			this.pause();
			render(progress);
			onStop?.(handler);
			return this;
		},
	};

	const thenable = Object.create(handler);
	thenable.then = function (resolve, reject) {
		onFinish = resolve;
		onStop = reject;
	};

	if (playNow) handler.play();

	return thenable;
};

function getScreenPosition(gridPosition) {
	let [centerX, centerY] = [playground.offsetWidth * 0.5, playground.offsetHeight * 0.5];
	let screenPosition = gridSystem.getPosition(add(gridPosition, [0.5, 0.5]));
	screenPosition = add(screenPosition, [centerX, centerY]);
	screenPosition = sub(screenPosition, [truckNorth.offsetWidth * 0.5, truckNorth.offsetHeight * 0.5]);
	return screenPosition;
}

function getExitPosition(position, direction) {
	position = add(position, mul([0.5, 0.5], direction));
	return position;
}

function truckAnimate(startPosition, endPosition, duration = 1000, truck = null, once) {
	// let distance = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
	// let duration = distance(startPosition, endPosition) / speed;
	// console.log(duration)
	let isOnce = true;
	return animate(
		{
			left: startPosition[0],
			top: startPosition[1],
		},
		{
			left: endPosition[0],
			top: endPosition[1],
		},
		duration,
		props => {
			if (isOnce) {
				truck = once?.();
				isOnce = false;
			}
			let distance = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
			let warehouse = add(warehousePosition, [0.5, 0.5]);
			let vendor = add(vendorPosition, [0.5, 0.5]);
			if (
				distance([props.left, props.top], warehouse) < 1.5 &&
				(props.left >= warehouse[0] || props.top >= warehouse[1])
			) {
				truck.style.zIndex = 3;
			} else if (
				distance([props.left, props.top], vendor) < 1.5 &&
				(props.left >= vendor[0] || props.top >= vendor[1])
			) {
				truck.style.zIndex = 3;
			} else {
				truck.style.zIndex = 1;
			}
			let [left, top] = getScreenPosition([props.left, props.top]);
			truck.style.left = Math.round(left) + 'px';
			truck.style.top = Math.round(top) + 'px';
			//   console.log(truck.style.left, truck.style.top);
		}
	);
}

function createCopyElement(element) {
	let copy = element.cloneNode(true);
	if (element == truckEast || element == truckWest)
		copy.innerHTML += `<div class='pin neg'><span>1</span></div>`;
	else copy.innerHTML += `<div class='pin'><span>1</span></div>`;
	//   copy.id = "";
	element.parentElement.append(copy);
	//   console.log(copy.classList);
	return copy;
}

function animatePath(path, duration = 3000) {
	duration = duration | 0;

	truckNorth.style.display = 'none';
	truckEast.style.display = 'none';
	truckSouth.style.display = 'none';
	truckWest.style.display = 'none';
	truckNorth.style.zIndex = '';
	truckEast.style.zIndex = '';
	truckSouth.style.zIndex = '';
	truckWest.style.zIndex = '';

	if (duration < 20) {
		return false;
	}
	// console.log(duration)

	let distance = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
	let totalDistance = path.slice(1).reduce((accum, node, index) => accum + distance(path[index], node), 0);

	let prevTruck = createCopyElement(truckNorth);
	let state = { handler: null };

	let chain = Promise.resolve();
	for (let i = 0; i < path.length - 1; i++) {
		chain = chain.then(() => {
			let d = (distance(path[i], path[i + 1]) / totalDistance) * duration;
			d *= 4;
			state.handler = truckAnimate(path[i], path[i + 1], d, prevTruck, () => {
				let direction = sub(path[i + 1], path[i]);
				let truck;
				if (direction[0] > 0) {
					truck = truckEast;
				} else if (direction[0] < 0) {
					truck = truckWest;
				} else if (direction[1] < 0) {
					truck = truckNorth;
				} else {
					truck = truckSouth;
				}
				truck = createCopyElement(truck);

				if (!new Set([truckEast, truckWest, truckNorth, truckSouth]).has(prevTruck)) {
					prevTruck.remove();
				}

				if (prevTruck != null && prevTruck != truck) prevTruck.style.display = 'none';

				prevTruck = truck;
				truck.style.display = 'block';
				return prevTruck;
			});
			return state.handler;
		});
	}
    
	chain.then(() => {
		if (prevTruck != null) prevTruck.style.display = 'none';
	});

	return state;
}

let truckPath = gridSystem.shortestPath(startPosition, endPosition).map(e => e[0]);
truckPath.unshift(getExitPosition(warehousePosition, warehouseDirection));
truckPath.push(getExitPosition(vendorPosition, vendorDirection));

// let animateState = animatePath(truckPath, 1000);
// console.log(animateState);
// setTimeout(() => {
// 	animateState.handler.pause();
// }, 500);

truckNorth.style.display =
	truckEast.style.display =
	truckSouth.style.display =
	truckWest.style.display =
		'none';

// console.log(
//     warehousePosition,
//     warehouseDirection,
//     getExitPosition(warehousePosition, warehouseDirection),
//     truckPath[0]
// );
// truckAnimate(getExitPosition(warehousePosition, warehouseDirection), truckPath[0][0]);
// truckAnimate(truckPath[truckPath.length - 2], truckPath[truckPath.length - 1]);

// window.addEventListener('resize', () => {
// 	gridSystem.setGridSize(warehouse.offsetWidth);
// 	gridSystem.update(playground);
// });
