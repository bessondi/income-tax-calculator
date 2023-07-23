import { StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../store/context/auth-context';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Button from '../components/ui/Button';
import { Keyboard } from 'react-native';
import { Colors } from '../constants/styles';
import Loader from '../components/ui/Loader';
import { collection, addDoc } from 'firebase/firestore';
import { firestoreDB } from '../constants/firebase-config';
import { currencyList } from '../constants/consts';

function CalculatorScreen() {
  const [currencyRate, setCurrencyRate] = useState('');
  const [isCalculationAvailable, setIsCalculationAvailable] = useState(false);
  const [hasTaxCalculation, setHasTaxCalculation] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [taxPercentValue, setTaxPercentValue] = useState('');
  const [amountValue, setAmountValue] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [date, setDate] = useState(new Date());
  const [messageFromServer, setMessageFromServer] = useState('');
  const authContext = useContext(AuthContext);

  const CalculateButton = ({ isDisable }) => {
    return (
      <View style={styles.footer}>
        <Button onPress={calculateTax} isMediumSize={true} isDisable={isDisable}>
          Calculate Tax
        </Button>
      </View>
    );
  };

  const CalculationResult = () => {
    return <Text style={styles.result}>{`Your tax for this month is \n ₾ ${currencyRate}`}</Text>;
  };

  const onChangeDate = (_, selectedDate) => {
    setDate(selectedDate);
  };

  const calculateTax = () => {
    const amount = parseFloat(amountValue);

    if (selectedCurrency === 'GEL' && taxPercentValue) {
      setCurrencyRate(((amount / 100) * taxPercentValue).toFixed(2));
      setHasTaxCalculation(true);
      return;
    }

    setIsLoadingData(true);

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const incomeDate = `${year}-${month}-${day}`;
    const bankCurrencyApi = `https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/?currencies=${selectedCurrency}&date=${incomeDate}`;

    axios
      .get(bankCurrencyApi)
      .then(response => {
        const rate = parseFloat(response.data[0].currencies[0].rate);

        if (rate && amount && taxPercentValue) {
          const taxAmount = (((rate * amount) / 100) * taxPercentValue).toFixed(2);

          setCurrencyRate(taxAmount);
          setHasTaxCalculation(true);
          console.log('currencyRate', taxAmount);

          return authContext.isAuthenticated
            ? addDoc(collection(firestoreDB, 'users'), {
                incomeAmount: amount,
                incomeDate: incomeDate,
                currency: selectedCurrency,
                bankRateForSelectedDateAndCurrency: rate,
                taxAmountInLari: taxAmount,
              })
            : null;
        }
      })
      .catch(error => {
        setHasTaxCalculation(false);
        console.log('Something went wrong:', error);
      })
      .finally(() => setIsLoadingData(false));
  };

  useEffect(() => {
    if (authContext.isAuthenticated) {
      axios
        .get(
          `https://mobile-app-af614-default-rtdb.europe-west1.firebasedatabase.app/message.json?auth=${authContext.token}`,
        )
        .then(response => setMessageFromServer(response.data))
        .catch(err => console.log('Message missing', err));
    }
  }, [authContext.isAuthenticated, authContext.token]);

  useEffect(() => {
    const isFormValid = !!(parseInt(amountValue) && parseInt(taxPercentValue) && selectedCurrency && date);
    if (isFormValid) {
      setIsCalculationAvailable(true);
      setHasTaxCalculation(false);
    } else {
      setIsCalculationAvailable(false);
    }
  }, [amountValue, taxPercentValue, selectedCurrency, date]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.rootContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Monthly Income</Text>
          {messageFromServer ? <Text style={styles.message}>{messageFromServer}</Text> : null}
        </View>

        <View style={styles.body}>
          <Text style={styles.label}>Monthly income amount</Text>
          <View style={styles.top}>
            <TextInput
              style={styles.input}
              onChangeText={setAmountValue}
              value={amountValue}
              placeholder="Type your income amount"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Tax percent</Text>
            <TextInput
              style={styles.input}
              onChangeText={setTaxPercentValue}
              value={taxPercentValue}
              placeholder="Type your tax percent"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.bottom}>
            <View style={styles.bottomLeft}>
              <Text style={styles.label}>Currency</Text>
              <DropDownPicker
                open={isCurrencyDropdownOpen}
                setOpen={setIsCurrencyDropdownOpen}
                value={selectedCurrency}
                setValue={setSelectedCurrency}
                items={currencyList}
                placeholder="Select currency"
                style={styles.currencyPicker}
              />
            </View>
            <View>
              <Text style={styles.dateLabel}>Income date</Text>
              <DateTimePicker
                testID="dateTimePicker"
                value={date}
                mode="date"
                is24Hour={true}
                onChange={onChangeDate}
                style={styles.datePicker}
              />
            </View>
          </View>
        </View>

        {hasTaxCalculation ? (
          !!currencyRate ? (
            <CalculationResult />
          ) : null
        ) : isLoadingData ? (
          <Loader />
        ) : (
          <CalculateButton isDisable={!isCalculationAvailable} />
        )}
        {}
      </View>
    </TouchableWithoutFeedback>
  );
}

export default CalculatorScreen;

const styles = StyleSheet.create({
  rootContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    paddingLeft: 32,
    paddingRight: 32,
    paddingBottom: 16,
  },
  label: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 4,
    textAlign: 'right',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  message: {
    fontSize: 18,
    marginBottom: 18,
    textAlign: 'center',
  },
  header: {
    width: '100%',
    alignItems: 'center',
  },
  body: {
    width: '100%',
  },
  input: {
    fontSize: 16,
    height: 46,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  bottom: {
    flexDirection: 'row',
  },
  bottomLeft: {
    flex: 1,
  },
  currencyPicker: {
    marginBottom: 12,
  },
  datePicker: {
    marginTop: 8,
  },
  footer: {
    marginTop: 12,
    width: '100%',
    zIndex: -1,
  },
  result: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    borderStyle: 'solid',
    borderColor: Colors.green,
    borderWidth: 1,
    borderRadius: 16,
    marginTop: 12,
    padding: 16,
    width: '100%',
    zIndex: -1,
  },
});
