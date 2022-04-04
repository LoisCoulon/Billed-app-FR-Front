/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import BillsContainer from "../containers/Bills";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import Bills from "../containers/Bills";
import router from "../app/Router.js";
import { ROUTES } from "../constants/routes";
import store from "../__mocks__/store.js";
import userEvent from "@testing-library/user-event";

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");

      expect(windowIcon).toHaveClass("active-icon");
    });

    test("Then bills should be ordered from earliest to latest", () => {
      const html = BillsUI({
        data: bills
      });
      document.body.innerHTML = html;
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });

    test("Then bills data should be displayed", () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });

      store.bills = jest.fn().mockImplementationOnce(() => {
        return {
          list: jest
            .fn()
            .mockResolvedValue([{ id: 1, data: () => ({ date: "" }) }]),
        };
      });

      const bills = new Bills({
        document,
        onNavigate,
        store: store,
        localStorage,
      });

      const res = bills.getBills();

      expect(res).toEqual(Promise.resolve({}));
    });

    describe("when I click on icon eye of the bill", () => {
      test("Then a modal should open", () => {
        $.fn.modal = jest.fn();
        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname });
        };

        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({ type: "Employee" })
        );

        const html = BillsUI({
          data: bills.sort((a, b) => new Date(b.date) - new Date(a.date)),
        });
        document.body.innerHTML = html;

        const billsContainer = new BillsContainer({
          document,
          onNavigate,
          store: store,
          localStorage: window.localStorage,
        });

        const iconEye = screen.getAllByTestId("icon-eye")[0];
        const handleShowModalFile = jest.fn((e) => {
          billsContainer.handleClickIconEye(e.target);
        });

        iconEye.addEventListener("click", handleShowModalFile);
        userEvent.click(iconEye);

        expect(handleShowModalFile).toHaveBeenCalled();
        expect(screen.getAllByText("Justificatif")).toBeTruthy();
      });
    });

    describe("When I click on new bill button", () => {
      test("Then a modal should open", () => {
        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({
            pathname,
          });
        };
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
          })
        );
        document.body.innerHTML = BillsUI({
          data: bills,
        });
        const bill = new Bills({
          document,
          onNavigate,
          store: null,
          bills,
          localStorage: window.localStorage,
        });
        $.fn.modal = jest.fn();

        const handleClickNewBill = jest.fn((e) => bill.handleClickNewBill);

        const iconNewBill = screen.getByTestId("btn-new-bill");
        iconNewBill.addEventListener("click", handleClickNewBill);
        fireEvent.click(iconNewBill);
        expect(handleClickNewBill).toHaveBeenCalled();

        const modale = screen.getAllByTestId("form-new-bill");
        expect(modale).toBeTruthy();
      });
    });
  });

  describe("When I am on Bills page but back-end send an error message", () => {
    test("Then, Error page should be rendered", () => {
      document.body.innerHTML = BillsUI({
        error: "some error message",
      });
      expect(screen.getAllByText("Erreur")).toBeTruthy();
    });
  });

  describe("When there are bills on the Bill page", () => {
    test("Then it should display an icon eye", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const iconEye = screen.getAllByTestId("icon-eye");
      expect(iconEye).toBeTruthy();
    });
  });
});

describe("Given I try to connect on Bill page as an Employee", () => {
  describe("When I am on Login Page", () => {
    test("Then it should render LoadingPage", () => {
      //loading Page
      document.body.innerHTML = BillsUI({
        loading: true,
      });
      expect(screen.getAllByText("Loading...")).toBeTruthy();
    });
    //error Page
    test("Then it should render ErrorPage", () => {
      document.body.innerHTML = BillsUI({ error: true });
      expect(screen.getAllByText("Erreur")).toBeTruthy();
    });
  });
});

//test integration GET
describe("Given I am a user connected as employee", () => {
  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(store, "bills");
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "a@a",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.appendChild(root);
      router();
    });
    test("fetches bills from an API and fails with 404 message error", async () => {
      store.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 404"));
          },
        };
      });
      const html = BillsUI({ error: "Erreur 404" });
      document.body.innerHTML = html;
      const message = await screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });

    test("fetches messages from an API and fails with 500 message error", async () => {
      store.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 500"));
          },
        };
      });

      const html = BillsUI({ error: "Erreur 500" });
      document.body.innerHTML = html;
      const message = await screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
});
