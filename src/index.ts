import {Money} from "bigint-money/dist";
import 'bootstrap/js/src/tab';
import jQuery from 'jquery';
import '../assets/stylesheets/main.scss';
import combinationData from "../data/combinations.json";
import {BrokerRepository} from "./BrokerRepository";
import {Combination} from "./Combination";
import {FundRepository} from "./FundRepository";
import {IndexRepository} from "./IndexRepository";
import {NumberFormatter} from "./NumberFormatter";
import {Percentage} from "./Percentage";
import {Portfolio} from "./Portfolio";
import {Simulation} from "./Simulation";
import {View} from "./View";
import {WealthTax} from "./WealthTax";

// Assume that if JavaScript doesn't load it's because of outdated browser (Safari 13)
document.getElementById('outdated-browser').hidden = true;

const brokerRepository = new BrokerRepository();
const fundRepository = new FundRepository(new IndexRepository());
const numberFormatter = new NumberFormatter();

const form: HTMLFormElement = <HTMLFormElement>document.getElementById('form');

function getInputValue(elementId: string): number {
    const field: HTMLInputElement = <HTMLInputElement>document.getElementById(elementId);

    return parseFloat(field.value);
}

const combinations: Combination[] = combinationData.map(function (combination: { broker: string, portfolio: { allocation: number, fund: string }[], automatedInvesting: boolean }): Combination {
    const broker = brokerRepository.getBroker(combination.broker);
    const funds = combination.portfolio.map(function (portfolio) {
        return {allocation: new Percentage(portfolio.allocation), fund: fundRepository.getFund(portfolio.fund)};
    })

    const portfolio = new Portfolio(funds);

    return {broker, portfolio, automatedInvesting: combination.automatedInvesting};
});

function runSimulation(combinations: Combination[]): void {
    const monthlyInvestment = new Money(getInputValue('monthly'), 'EUR');
    let initialInvestment = monthlyInvestment;

    const differentInitialInvestmentElement: HTMLInputElement = <HTMLInputElement>document.getElementById('differentInitialInvestment');
    if (differentInitialInvestmentElement.checked) {
        initialInvestment = new Money(getInputValue('initial'), 'EUR');
    }
    const years = getInputValue('years');
    const expectedYearlyReturn = new Percentage(getInputValue('return'));
    const expectedDividendYield = new Percentage(getInputValue('dividendYield'));

    const totalInvestment = initialInvestment.add(monthlyInvestment.multiply(12 * years - 1));
    document.getElementById('totalInvestment').innerText = numberFormatter.formatMoney(totalInvestment);
    for (let element of document.getElementsByClassName('years')) {
        element.innerHTML = years.toString();
    }

    const automatedInvestmentElement: HTMLInputElement = <HTMLInputElement>document.getElementById('automatedInvestment');
    const smallCapsCheckbox: HTMLInputElement = <HTMLInputElement>document.getElementById('smallCaps');

    if (automatedInvestmentElement.checked) {
        combinations = combinations.filter((combination: Combination) => combination.automatedInvesting === true);
    }

    if (smallCapsCheckbox.checked) {
        combinations = combinations.filter((combination: Combination) => combination.portfolio.containsSmallCaps());
    }

    let results = combinations.map(function (combination: Combination) {
        combination.portfolio.reset();

        const simulation = new Simulation(
            new WealthTax(),
            combination.broker,
            combination.portfolio,
            initialInvestment,
            monthlyInvestment,
            expectedYearlyReturn,
            expectedDividendYield
        );

        simulation.run(years);

        return {combination, simulation};
    });

    results = results.sort((a, b) => b.simulation.getNetResult() - a.simulation.getNetResult());

    const view = new View(<HTMLDivElement>document.getElementById('results'), new NumberFormatter());
    view.update(results);

    document.querySelectorAll('.nav-tabs a.nav-link').forEach((element) => {
        element.addEventListener('click', (event: Event) => {
            event.preventDefault();

            if (element.classList.contains('active')) {
                element.classList.remove('active');
                const tab = document.querySelector(element.attributes.getNamedItem('href').value);
                tab.classList.remove('active');
                return;
            }

            jQuery(element).tab('show');
        });
    });
}

if (form) {
    form.onchange = function () {
        if (form.checkValidity()) {
            runSimulation(combinations);
        }
    }

    window.onload = function () {
        document.getElementById('differentInitialInvestment').addEventListener('change', function () {
            return document.getElementById('initial').toggleAttribute('disabled');
        });

        runSimulation(combinations);
    };
}

declare global {
    interface Window { _paq: any; }
}

let _paq = window._paq = window._paq || [];
_paq.push(['trackPageView']);
_paq.push(['enableLinkTracking']);
(function () {
    var u = "https://stats.nicwortel.nl/";
    _paq.push(['setTrackerUrl', u + 'matomo.php']);
    _paq.push(['setSiteId', 2]);
    var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
    g.type = 'text/javascript';
    g.async = true;
    g.src = u + 'matomo.js';
    s.parentNode.insertBefore(g, s);
})();
